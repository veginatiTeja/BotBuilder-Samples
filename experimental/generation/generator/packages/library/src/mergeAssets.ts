/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as fs from 'fs-extra';
import * as ppath from 'path';
import * as os from 'os';
import {assetDirectory, computeJSONHash, Feedback, FeedbackType, getHashCode, isUnchanged, writeFile, stringify} from './dialogGenerator'

const {Templates, SwitchCaseBodyContext} = require('botbuilder-lg');
const LUParser = require('@microsoft/bf-lu/lib/parser/lufile/luParser');
const sectionOperator = require('@microsoft/bf-lu/lib/parser/lufile/sectionOperator');
const lusectiontypes = require('@microsoft/bf-lu/lib/parser/utils/enums/lusectiontypes')

const GeneratorPattern = /\r?\n> Generator: ([a-zA-Z0-9]+)/

function filenamePath(filename: string, files: string[], required: boolean = true): string {
    const path = files.find(file => file.endsWith(filename))
    if (required && !path) {
        throw new Error(`Could not find ${filename}`)
    }
    return path ?? ''
}

/**
 * @description：Detect if the old file was not changed.
 * @param oldFileList Paths to the old asset.
 * @param fileName File name of the .lu, .lg, .dialog and .qna file.
 */
async function isOldUnchanged(oldFileList: string[], fileName: string): Promise<boolean> {
    const filePath = filenamePath(fileName, oldFileList, false)
    return !filePath || isUnchanged(filePath)
}

/**
 * @description：Get hashcode of the file
 * @param fileList Path to the asset.
 * @param fileName File name of the .lu, .lg, .dialog and .qna file.
 */
async function getHashCodeFromFile(fileList: string[], fileName: string): Promise<string> {
    const path = filenamePath(fileName, fileList)
    return getHashCode(path)
}

/**
 * @description：Copy the single file including .lu .lg and .dialog.
 * @param sourcePath Path to the folder where the file is copied from.
 * @param destPath Path to the folder where the file is copied to.
 * @param fileName File name of the .lu, .lg, .dialog and .qna file.
 * @param sourceFileList List of source file paths.
 * @param feedback Callback function for progress and errors.
 */
async function copySingleFile(sourcePath: string, destPath: string, fileName: string, sourceFileList: string[], feedback: Feedback): Promise<void> {
    const sourceFilePath = filenamePath(fileName, sourceFileList)
    const destFilePath = sourceFilePath.replace(sourcePath, destPath)
    const destDirPath = ppath.dirname(destFilePath)
    await fs.ensureDir(destDirPath)
    await fs.copyFile(sourceFilePath, destFilePath)
    feedback(FeedbackType.info, `Copying ${fileName} from ${sourceFilePath}`)
}

/**
 * @description：Write file to the specific path.
 * @param sourcePath Path to the folder where the file is copied from.
 * @param destPath Path to the folder where the file is copied to.
 * @param fileName File name of the .lu, .lg, .dialog and .qna file.
 * @param sourceFileList List of source file paths.
 * @param var File content.
 * @param feedback Callback function for progress and errors.
 */
async function writeToFile(sourcePath: string, destPath: string, fileName: string, sourceFileList: string[], val: string, feedback: Feedback): Promise<void> {
    const sourceFilePath = filenamePath(fileName, sourceFileList)
    const destFilePath = sourceFilePath.replace(sourcePath, destPath)
    const destDirPath = ppath.dirname(destFilePath)
    await fs.ensureDir(destDirPath)
    await writeFile(destFilePath, val, feedback, true)
    feedback(FeedbackType.info, `Merging ${fileName}`)
}

/**
 * @description：Show message when cannot merge.
 * @param oldFileList List of old file paths.
 * @param newFileList List of new file paths.
 * @param feedback Callback function for progress and errors.
 */
function cannotMergeMessage(fileName: string, oldFileList: string[], newFileList: string[], feedback: Feedback): void {
    const oldPath = oldFileList.find(file => file.endsWith(fileName))
    const newPath = newFileList.find(file => file.endsWith(fileName))
    feedback(FeedbackType.info, `*** Old and new both changed, manually merge ${oldPath} and ${newPath} ***`)
}

/**
 * @description：Get all file paths from the specific dir.
 * @param dir Root dir.
 * @param fileList List of file paths.
 */
async function getFiles(dir: string, fileList?: string[]): Promise<string[]> {
    fileList = fileList ?? []
    const files = await fs.readdir(dir)
    for (const file of files) {
        const name = dir + '/' + file
        if ((await fs.stat(name)).isDirectory()) {
            await getFiles(name, fileList)
        } else {
            fileList.push(name)
        }
    }
    return fileList
}

function refFilename(ref: string, feedback: Feedback): string {
    let file = ''
    const matches = ref.match(/([^/]*)\)/)
    if (matches && matches.length == 2) {
        file = matches[1]
    } else {
        feedback(FeedbackType.error, `Could not parse ref ${ref}`)
    }
    return file
}

/**
 * Merge two bot assets to generate one merged bot asset. 
 *
 * Rules for merging:
 * 1) A file unchanged since last generated will be overwritten by the new file.
 * 2) A changed file will have its .lg/.lu enum or .dialog triggers overwritten,
 *    but nothing else and its hash code should not be updated.
 * 3) If a property existed in the old schema, but does not exist in the new
 *    schema all files for that property should be deleted and have references
 *    removed.
 * 4) If a property exists in both old and new schema, but a file is not present
 *    in the new directory, the file should not be copied over again and
 *    references should not be added.
 * 5) The order of .dialog triggers should be the old order with new stuff coming after everything before it in old.
 * 6) If a file has changed and cannot be updated there will be a message to
 *    merge manually.
 *
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old asset.
 * @param newPath Path to the folder of the new asset.
 * @param mergedPath Path to the folder of the merged asset.
 * @param locales Locales.
 * @param feedback Callback function for progress and errors.
 *
 */
export async function mergeAssets(schemaName: string, oldPath: string, newPath: string, mergedPath: string, locales: string[], feedback?: Feedback): Promise<boolean> {
    if (!feedback) {
        feedback = (_info, _message) => true
    }

    if (oldPath === mergedPath) {
        const tempOldPath = `${os.tmpdir()}/tempOld/`
        await fs.emptyDir(tempOldPath)
        await fs.copy(oldPath, tempOldPath)
        await fs.emptyDir(oldPath)
        oldPath = tempOldPath
    }

    try {
        for (const locale of locales) {
            const oldFileList = await getFiles(oldPath)
            const newFileList = await getFiles(newPath)

            const {oldPropertySet, newPropertySet} = await parseSchemas(schemaName, oldPath, newPath, newFileList, mergedPath, feedback)

            await mergeDialogs(schemaName, oldPath, oldFileList, newPath, newFileList, mergedPath, locale, oldPropertySet, newPropertySet, feedback)
            await mergeRootLUFile(schemaName, oldPath, oldFileList, newPath, newFileList, mergedPath, locale, feedback)
            await mergeRootLGFile(schemaName, oldPath, oldFileList, newPath, newFileList, mergedPath, locale, oldPropertySet, newPropertySet, feedback)
            await mergeOtherFiles(oldPath, oldFileList, newPath, newFileList, mergedPath, feedback)
        }
    } catch (e) {
        feedback(FeedbackType.error, (e as Error).message)
    }

    return true
}

/**
 * @description: Merge other types of files, e.g qna files.
 * @param oldPath Path to the folder of the old asset.
 * @oldFileList List of old file paths.
 * @param newPath Path to the folder of the new asset.
 * @newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param feedback Callback function for progress and errors.
 */
async function mergeOtherFiles(oldPath: string, oldFileList: string[], newPath: string, newFileList: string[], mergedPath: string, feedback: Feedback): Promise<void> {
    for (const file of oldFileList) {
        if ((file.endsWith('.lu.dialog') || !file.endsWith('.dialog')) && !file.endsWith('.lu') && !file.endsWith('.lg')) {
            const fileName = ppath.basename(file)
            await copySingleFile(oldPath, mergedPath, fileName, oldFileList, feedback)
        }
    }

    for (const file of newFileList) {
        if ((file.endsWith('.lu.dialog') || !file.endsWith('.dialog')) && !file.endsWith('.lu') && !file.endsWith('.lg')) {
            const fileName = ppath.basename(file)
            await copySingleFile(newPath, mergedPath, fileName, newFileList, feedback)
        }

    }
}

/**
 * @description: Merge root lg file from two assets based on the new and old root files.
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old asset.
 * @param oldFileList List of old file paths.
 * @param newPath Path to the folder of the new asset.
 * @param newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param locale Locale.
 * @param oldPropertySet Property Set from the old .schema file.
 * @param newPropertySet Property Set from the new .schema file.
 * @param feedback Callback function for progress and errors.
 */
async function mergeRootLGFile(schemaName: string, oldPath: string, oldFileList: string[], newPath: string, newFileList: string[], mergedPath: string, locale: string, oldPropertySet: Set<string>, newPropertySet: Set<string>, feedback: Feedback): Promise<void> {
    const outDir = assetDirectory('.lg')
    const oldText = await fs.readFile(ppath.join(oldPath, outDir, locale, `${schemaName}.${locale}${'.lg'}`), 'utf8')
    const oldRefs = oldText.split(os.EOL)
    const newText = await fs.readFile(ppath.join(newPath, outDir, locale, `${schemaName}.${locale}${'.lg'}`), 'utf8')
    const newRefs = newText.split(os.EOL)

    const resultRefs: string[] = []
    const oldRefSet = new Set<string>()

    for (const ref of oldRefs) {
        if (ref.match('> Generator:')) {
            if (resultRefs.length !== 0 && resultRefs[resultRefs.length - 1] === '') {
                resultRefs.pop()
            }
            break
        }
        if (!ref.startsWith('[')) {
            resultRefs.push(ref)
            continue
        }
        oldRefSet.add(ref)
        const file = refFilename(ref, feedback)
        const extractedProperty = extractProperty(file, oldPropertySet, schemaName)
        if (extractedProperty !== undefined) {
            if (newPropertySet.has(extractedProperty)) {
                resultRefs.push(ref)
                if (file.match(`${extractedProperty}Value`)) {
                    await changeEntityEnumLG(oldPath, oldFileList, newPath, newFileList, mergedPath, file, feedback)
                } else {
                    if (await !isOldUnchanged(oldFileList, file) && await getHashCodeFromFile(oldFileList, file) !== await getHashCodeFromFile(newFileList, file)) {
                        cannotMergeMessage(file, oldFileList, newFileList, feedback)
                    } else {
                        await copySingleFile(oldPath, mergedPath, file, oldFileList, feedback)
                    }
                }
            }
        } else {
            resultRefs.push(ref)
            if (newText.match(file) && !await isOldUnchanged(oldFileList, file) && await getHashCodeFromFile(oldFileList, file) !== await getHashCodeFromFile(newFileList, file)) {
                cannotMergeMessage(file, oldFileList, newFileList, feedback)
            } else {
                await copySingleFile(oldPath, mergedPath, file, oldFileList, feedback)
            }
        }
    }

    for (const ref of newRefs) {
        if (!ref.startsWith('[')) {
            continue
        }
        if (!oldRefSet.has(ref)) {
            resultRefs.push(ref)
            const file = refFilename(ref, feedback)
            await copySingleFile(newPath, mergedPath, file, newFileList, feedback)
        }
    }

    let val = resultRefs.join(os.EOL)

    const patternIndex = oldText.search(GeneratorPattern)
    if (patternIndex !== -1) {
        val = val + os.EOL + oldText.substring(patternIndex)
    }

    await writeToFile(oldPath, mergedPath, `${schemaName}.${locale}.lg`, oldFileList, val, feedback)
}

/**
 * @description: Merge root lu file from two assets based on the new and old root files.
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old asset.
 * @param oldFileList List of old file paths.
 * @param newPath Path to the folder of the new asset.
 * @param newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param locale Locale.
 * @param feedback Callback function for progress and errors.
 */
async function mergeRootLUFile(schemaName: string, oldPath: string, oldFileList: string[], newPath: string, newFileList: string[], mergedPath: string, locale: string, feedback: Feedback): Promise<void> {
    const outDir = assetDirectory('.lu')
    const oldText = await fs.readFile(ppath.join(oldPath, outDir, locale, `${schemaName}-definition.${locale}.lu`), 'utf8')
    const oldRefs = oldText.split(os.EOL)
    const newText = await fs.readFile(ppath.join(newPath, outDir, locale, `${schemaName}-definition.${locale}.lu`), 'utf8')
    const newRefs = newText.split(os.EOL)

    const delUtteranceSet = new Set<string>()
    for (const ref of oldRefs) {
        if (ref.startsWith('[')) {
            const filename = refFilename(ref, feedback)
            await getDeletedUtteranceSet(filename, oldFileList, delUtteranceSet)
        }
    }

    await updateCustomLUFile(schemaName, oldPath, newPath, oldFileList, mergedPath, locale, feedback)

    const resultRefs: string[] = []

    for (const ref of newRefs) {
        if (ref.match('> Generator:')) {
            if (resultRefs.length !== 0 && resultRefs[resultRefs.length - 1] === '') {
                resultRefs.pop()
            }
            break
        }
        else if (!ref.startsWith('[')) {
            resultRefs.push(ref)
            continue
        }
        else {
            resultRefs.push(ref)
            const filename = refFilename(ref, feedback)
            await updateGeneratedLUFile(filename, newFileList, newPath, mergedPath, delUtteranceSet, feedback)
        }
    }

    let val = resultRefs.join(os.EOL)

    const patternIndex = oldText.search(GeneratorPattern)
    if (patternIndex !== -1) {
        val = val + os.EOL + oldText.substring(patternIndex)
    }

    await writeToFile(oldPath, mergedPath, `${schemaName}-definition.${locale}.lu`, oldFileList, val, feedback)
}

const valuePattern = /{@?([^=]*Value)\s*=([^}]*)}/g
const commentOutPattern = /^>\s*-/m

/**
 * @description: Get the set of deleted utterance patterns.
 * @param filename Name of the lu file.
 * @param newFileList List of old file paths.
 * @param delUtteranceSet Set of deleted utterance patterns.
 */
async function getDeletedUtteranceSet(filename: string, oldFileList: string[], delUtteranceSet: Set<string>): Promise<void> {
    const filePath = filenamePath(filename, oldFileList)
    const text = await fs.readFile(filePath, 'utf8')
    const lines = text.split(os.EOL)
    for (const line of lines) {
        if (line.match(commentOutPattern)) {
            const newLine = await generatePatternUtterance(line)
            delUtteranceSet.add(newLine)
        }
    }
}

/**
 * @description: Update generated lu file if the old lu file has been modified.
 * @param filename Name of the lu file.
 * @param newFileList List of new file paths.
 * @param newPath Path to the folder of the new asset.
 * @param mergedPath Path to the folder of the merged asset.
 * @param delUtteranceSet Set of deleted utterance patterns.
 * @param feedback Callback function for progress and errors.
 */
async function updateGeneratedLUFile(filename: string, newFileList: string[], newPath: string, mergedPath: string, delUtteranceSet: Set<string>, feedback: Feedback): Promise<void> {
    const filePath = filenamePath(filename, newFileList)
    const text = await fs.readFile(filePath, 'utf8')
    const lines = text.split(os.EOL)
    const resultLines: string[] = []
    let changed = false
    for (const line of lines) {
        const newLine = await generatePatternUtterance(line)
        if (delUtteranceSet.has(newLine)) {
            changed = true
            resultLines.push(`>${line}`)
        } else {
            resultLines.push(line)
        }
    }
    if (changed) {
        let val = resultLines.join(os.EOL)
        await writeToFile(newPath, mergedPath, filename, newFileList, val, feedback)
    } else {
        await copySingleFile(newPath, mergedPath, filename, newFileList, feedback)
    }
}

/**
 * @description: Generate the common pattern of the utterances.
 * @param line Line of the lu file.
 */
async function generatePatternUtterance(line: string): Promise<string> {
    line = line.replace(/{@?[^=]+=|}|^>+\s*-?\s*|^\s*-\s*|^\s+|\s+$/gm, '')
    return line
}

/**
 * @description: Update custom lu file if the schema has been changed.
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old bot asset.
 * @param newPath Path to the folder of the new bot asset.
 * @param oldFileList List of old file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param locale Locale.
 * @param feedback Callback function for progress and errors.
 */
async function updateCustomLUFile(schemaName: string, oldPath: string, newPath: string, oldFileList: string[], mergedPath: string, locale: string, feedback: Feedback): Promise<void> {
    const filename = `${schemaName}.${locale}.lu`
    const customLuFilePath = filenamePath(filename, oldFileList)
    const text = await fs.readFile(customLuFilePath, 'utf8')
    const lines = text.split(os.EOL)
    const resultLines: string[] = []

    const propertyValueSynonyms = await getSynonyms(schemaName, newPath, locale)
    let changed = false
    for (const line of lines) {
        if (line.match(valuePattern)) {
            const newLine = await replaceLine(line, propertyValueSynonyms)
            resultLines.push(newLine)
            changed = true
        } else {
            resultLines.push(line)
        }
    }

    const val = resultLines.join(os.EOL)
    await writeToFile(oldPath, mergedPath, filename, oldFileList, val, feedback)
}

/**
 * @description: Replace the non-existing synonym in the utterance with the exisiting one.
 * @param line Example utterance.
 * @param propertyValueSynonyms Map of property value to its synonyms.
 */
async function replaceLine(line: string, propertyValueSynonyms: Map<string, Set<string>>): Promise<string> {
    const matches = line.match(valuePattern)
    if (matches !== undefined && matches !== null) {
        for (let i = 0; i < matches.length; i++) {
            const phrases = matches[i].split('=')
            const key = phrases[0].replace('{@', '').trim()
            const value = phrases[1].replace('}', '').trim()
            if (propertyValueSynonyms.has(key)) {
                const synonymsSet = propertyValueSynonyms.get(key)
                if (synonymsSet !== undefined && !synonymsSet.has(value)) {
                    const items = Array.from(synonymsSet)
                    const randomSynomym = items[Math.floor(Math.random() * items.length)]
                    const replacePattern = `{@${key}=${randomSynomym}`
                    line = line.replace(matches[i], replacePattern)
                }
            }
        }
    }
    return line
}

/**
 * @description: Merge individual lg files which have the template with SWITCH ENUM.
 * @param oldPath Path to the folder of the old asset.
 * @param oldFileList List of old file paths.
 * @param newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param filename File name of the .lg file.
 * @param feedback Callback function for progress and errors.
 */
async function changeEntityEnumLG(oldPath: string, oldFileList: string[], newPath: string, newFileList: string[], mergedPath: string, filename: string, feedback: Feedback): Promise<void> {
    const oldFilePath = oldFileList.filter(file => file.match(filename))[0]
    if (await isOldUnchanged(oldFileList, filename)) {
        await copySingleFile(newPath, mergedPath, filename, newFileList, feedback)
    } else {
        const oldText = await fs.readFile(oldFilePath, 'utf8')
        const oldStatements = oldText.split(os.EOL)
        const oldTemplates = Templates.parseText(oldText)

        const newFilePath = newFileList.filter(file => file.endsWith(filename))[0]
        const newText = await fs.readFile(newFilePath, 'utf8')
        const newStatements = newText.split(os.EOL)
        const newTemplates = Templates.parseText(newText)

        let mergedStatements: string[] = []

        const recordPart: object[] = []

        for (const oldTemplate of oldTemplates) {
            const oldBody = oldTemplate.templateBodyParseTree
            if (oldBody === undefined) {
                continue
            }
            if (oldBody instanceof SwitchCaseBodyContext) {
                for (const newTemplate of newTemplates) {
                    if (newTemplate.name !== oldTemplate.name) {
                        continue
                    }
                    const newBody = newTemplate.templateBodyParseTree
                    if (newBody instanceof SwitchCaseBodyContext) {
                        const newSwitchStatements: string[] = []
                        const newEnumValueMap = new Map<string, number>()
                        const oldEnumEntitySet = new Set<string>()
                        const newRules = newBody.switchCaseTemplateBody().switchCaseRule()
                        for (const rule of newRules) {
                            const state = rule.switchCaseStat()
                            // get enumEntity and its following statements
                            if (state.text.match('\s*-\s*CASE:')) {
                                const enumEntity = state.text.replace('-CASE:${', '').replace('}', '')
                                const start = state.start.line + newTemplate.sourceRange.range.start.line
                                newEnumValueMap.set(enumEntity, start)
                            }
                        }
                        const {startIndex, endIndex} = parseLGTemplate(oldTemplate, oldBody, oldStatements, newStatements, newEnumValueMap, oldEnumEntitySet, newSwitchStatements)
                        const statementInfo = {
                            start: startIndex, end: endIndex, newSStatements: newSwitchStatements
                        }
                        recordPart.push(statementInfo)
                    }
                }
            }
        }

        if (recordPart.length !== 0) {
            let startSplit = 0
            const arrList: [string[]] = [[]]
            for (const obj of recordPart) {
                const arr = oldStatements.slice(startSplit, obj['start'])
                arrList.push(arr)
                arrList.push(obj['newSStatements'])
                startSplit = obj['end']
            }

            if (startSplit !== oldStatements.length) {
                const arr = oldStatements.slice(startSplit)
                arrList.push(arr)
            }

            for (const arr of arrList) {
                mergedStatements = mergedStatements.concat(arr)
            }
            const val = mergedStatements.join(os.EOL)
            await writeToFile(oldPath, mergedPath, filename, oldFileList, val, feedback)
        } else {
            await writeToFile(oldPath, mergedPath, filename, oldFileList, oldText, feedback)
        }
    }
}

/**
 * @description: Update old LG Template which has SWITCH ENUM.
 * @param oldTemplate Template from the old .lg file. 
 * @param oldBody   Body from the old .lg file.
 * @param oldStatements Statement array from the old .lg file.
 * @param newStatements Statement array from the new .lg file.
 * @param newEnumValueMap Map for Enum Entity key-value pair from the new .lg file.
 * @param oldEnumEntitySet Set for Enum Entity from the old .lg file.
 * @param newSwitchStatements Merged switch statement array.
 */
function parseLGTemplate(oldTemplate: any, oldBody: any, oldStatements: string[], newStatements: string[], newEnumValueMap: Map<string, number>, oldEnumEntitySet: Set<string>, newSwitchStatements: string[]): {startIndex: number, endIndex: number} {
    let startIndex = 0
    let endIndex = 0
    const oldRules = oldBody.switchCaseTemplateBody().switchCaseRule()
    for (const rule of oldRules) {
        const state = rule.switchCaseStat()
        if (state.text.match('\s*-\s*SWITCH')) {
            startIndex = state.start.line + oldTemplate.sourceRange.range.start.line - 1
            newSwitchStatements.push(oldStatements[startIndex])
            let i = startIndex + 1
            while (i < oldStatements.length && !oldStatements[i].toLowerCase().match('case') && !oldStatements[i].toLowerCase().match('default')) {
                newSwitchStatements.push(oldStatements[i])
                i++
            }
        } else if (state.text.match('\s*-\s*CASE')) {
            const enumEntity = state.text.replace('-CASE:${', '').replace('}', '')
            oldEnumEntitySet.add(enumEntity)
            if (newEnumValueMap.has(enumEntity)) {
                let k = state.start.line + oldTemplate.sourceRange.range.start.line - 1
                newSwitchStatements.push(oldStatements[k])
                k++
                while (k < oldStatements.length && !oldStatements[k].toLowerCase().match('case') && !oldStatements[k].toLowerCase().match('default')) {
                    newSwitchStatements.push(oldStatements[k])
                    k++
                }
            }
        } else if (state.text.match('\s*-\s*DEFAULT')) {
            for (const [key, value] of newEnumValueMap) {
                if (!oldEnumEntitySet.has(key)) {
                    let k = value - 1
                    newSwitchStatements.push(newStatements[k])
                    k++
                    while (k < newStatements.length && !newStatements[k].toLowerCase().match('case') && !newStatements[k].toLowerCase().match('default')) {
                        newSwitchStatements.push(newStatements[k])
                        k++
                    }

                }
            }
            let m = state.start.line + oldTemplate.sourceRange.range.start.line - 1
            newSwitchStatements.push(oldStatements[m])
            m++
            while (m < oldStatements.length && !oldStatements[m].match('#') && !oldStatements[m].startsWith('[')) {
                newSwitchStatements.push(oldStatements[m])
                m++
            }
            endIndex = m
        }
    }

    return {startIndex, endIndex}
}

// Insert a trigger from newTriggers into mergedTriggers so that it comes after every trigger before it
function insertTrigger(trigger: number, newTriggers: string[], mergedTriggers: string[]) {
    const name = newTriggers[trigger]
    let max = -1
    for (let i = 0; i < trigger; ++i) {
        let pos = newTriggers.indexOf(name)
        if (pos > max) {
            max = pos
        }
    }
    mergedTriggers.splice(max + 1, 0, name)
}

async function isUnchangedTrigger(trigger: any, fileList: string[], feedback: Feedback): Promise<boolean> {
    if (typeof trigger === 'string') {
        return await isOldUnchanged(fileList, trigger + '.dialog')
    } else {
        const oldHash = trigger.$Generator
        delete trigger.$Generator
        const newHash = computeJSONHash(trigger)
        trigger.$Generator = oldHash
        return oldHash === newHash
    }
}

/**
 * @description: Merge two main .dialog files following the trigger ordering rule.
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old asset.
 * @param oldFileList List of old file paths.
 * @param newPath Path to the folder of the new asset.
 * @param newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param locale Locale
 * @param oldPropertySet Property Set from the old .schema file.
 * @param newPropertySet Property Set from the new .schema file.
 * @param feedback Callback function for progress and errors.
 */
async function mergeDialogs(schemaName: string, oldPath: string, oldFileList: string[], newPath: string, newFileList: string[], mergedPath: string, locale: string, oldPropertySet: Set<string>, newPropertySet: Set<string>, feedback: Feedback): Promise<void> {
    const oldObj = JSON.parse(await fs.readFile(ppath.join(oldPath, schemaName + '.dialog'), 'utf8'))
    const newObj = JSON.parse(await fs.readFile(ppath.join(newPath, schemaName + '.dialog'), 'utf8'))
    const newTriggers: string[] = []
    const newTriggerMap = new Map<string, any>()
    const mergedTriggers: string[] = []
    const mergedTriggerMap = new Map<string, any>()

    // Collect new triggers where a trigger is either a string (for reference) or object (inline)
    // Generated triggers have $source in object, custom triggers do not
    for (const trigger of newObj['triggers']) {
        const triggerName = getTriggerName(trigger)
        newTriggers.push(triggerName)
        newTriggerMap.set(triggerName, trigger)
    }

    // Loop over old triggers and create merged triggers 
    for (let trigger of oldObj['triggers']) {
        const triggerName = getTriggerName(trigger)
        const isGenerated = extractProperty(triggerName, oldPropertySet, schemaName)
        const newTrigger = newTriggerMap.get(triggerName)
        if (newTrigger && await isUnchangedTrigger(trigger, oldFileList, feedback)) {
            // Use new trigger
            trigger = newTrigger
            if (typeof trigger === 'string') {
                await copySingleFile(newPath, mergedPath, triggerName + '.dialog', newFileList, feedback)
            }
        } else if (!newTrigger && isGenerated) {
            // Drop old generated triggers not in new
            trigger = null
        } else if (typeof trigger === 'string') {
            // Use old trigger
            await copySingleFile(oldPath, mergedPath, triggerName + '.dialog', oldFileList, feedback)
        }
        if (trigger) {
            mergedTriggers.push(triggerName)
            mergedTriggerMap.set(triggerName, trigger)
        }
    }

    // Copy any new triggers not found in merged
    for (let i = 0; i < newTriggers.length; ++i) {
        const triggerName = newTriggers[i]
        if (!mergedTriggerMap.has(triggerName)) {
            // Not in merged triggers yet
            const trigger = newTriggerMap.get(triggerName)
            insertTrigger(i, newTriggers, mergedTriggers)
            mergedTriggerMap.set(triggerName, trigger)
            if (typeof trigger === 'string') {
                await copySingleFile(newPath, mergedPath, triggerName + '.dialog', newFileList, feedback)
            }
        }
    }

    // Create array of triggers from newTriggers
    const triggers: any[] = []
    for (const triggerName of mergedTriggers) {
        triggers.push(mergedTriggerMap.get(triggerName))
    }

    oldObj['triggers'] = triggers
    await writeToFile(oldPath, mergedPath, schemaName + '.dialog', oldFileList, stringify(oldObj), feedback)

    // Copy recognized dialog
    await copySingleFile(newPath, mergedPath, schemaName + '.' + locale + '.lu.dialog', newFileList, feedback)
}

/**
 * @description: Get the trigger name
 * @param trigger trigger from main.dialog file
 */
function getTriggerName(trigger: any): string {
    let triggerName: string
    if (typeof trigger !== 'string') {
        triggerName = trigger['$source'] ?? JSON.stringify(trigger)
    } else {
        triggerName = trigger
    }
    return triggerName
}

/**
 * @description: Extract property from a filename.
 * @param filename File name of .lu, .lg, or .dialog file.
 * @param propertySet Property set from the .schema file.
 * @param schemaName Name of the .schema file.
 */
function extractProperty(filename: string, propertySet: Set<string>, schemaName: string): string | undefined {
    let property: string | undefined
    const match = filename.match(`^${schemaName}-([^.-]+?)(Value)?[.-]`)
    if (match && propertySet.has(match[1])) {
        property = match[1]
    }
    return property
}

/**
 * @description: Get the old property set and new property set from schema files.
 * @param schemaName Name of the .schema file.
 * @param oldPath Path to the folder of the old asset.
 * @param newPath Path to the folder of the new asset.
 * @param newFileList List of new file paths.
 * @param mergedPath Path to the folder of the merged asset.
 * @param feedback Callback function for progress and errors.
 */
async function parseSchemas(schemaName: string, oldPath: string, newPath: string, newFileList: string[], mergedPath: string, feedback: Feedback): Promise<{oldPropertySet: Set<string>, newPropertySet: Set<string>}> {
    const oldPropertySet = new Set<string>()
    const newPropertySet = new Set<string>()

    const oldObj = JSON.parse(await fs.readFile(ppath.join(oldPath, schemaName + '.json'), 'utf8'))
    const newObj = JSON.parse(await fs.readFile(ppath.join(newPath, schemaName + '.json'), 'utf8'))

    for (const property in oldObj['properties']) {
        oldPropertySet.add(property)
    }
    for (const property in newObj['properties']) {
        newPropertySet.add(property)
    }

    await copySingleFile(newPath, mergedPath, schemaName + '.json', newFileList, feedback)
    return {oldPropertySet, newPropertySet}
}

/**
 * @description: Get the synonyms of the enum entity.
 * @param schemaName Name of the .schema file.
 * @param newPath Path to the folder of the new asset.
 */
async function getSynonyms(schemaName: string, newPath: string, locale: string): Promise<Map<string, Set<string>>> {
    const template = await fs.readFile(ppath.join(newPath, schemaName + '.json'), 'utf8')
    const newObj = JSON.parse(template)
    const propertyValueSynonyms = new Map<string, Set<string>>()

    for (const property in newObj['properties']) {
        const entityName = `${property}Value`
        const propExamples = newObj['properties'][property]['$examples']
        const globalExamples = newObj['$examples']
        const valueExamples = propExamples?.[locale]?.[entityName] ?? globalExamples?.[locale]?.[entityName] ?? propExamples?.['']?.[entityName] ?? globalExamples?.['']?.[entityName]

        if (valueExamples) {
            const synonymsSet = new Set<string>()
            for (const enumEntity in valueExamples) {
                synonymsSet.add(enumEntity)
                for (const synonym in valueExamples[enumEntity]) {
                    synonymsSet.add(synonym)
                }
            }
            propertyValueSynonyms.set(`${property}Value`, synonymsSet)
        }
    }

    return propertyValueSynonyms
}
