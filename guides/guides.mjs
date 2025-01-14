#!/usr/bin/env node

/*
 * Copyright 2024 Red Hat Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import childProcess from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import url from 'node:url'
import JSZip from 'jszip'

const donwloadFMPP = async (url, file) => {
  if (!fs.existsSync(file)) {
    console.log('Downloading fmpp from %s', url)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Error downloading fmpp.')
    }
    await fs.promises.writeFile(file, Readable.fromWeb(response.body))
  }
}

const unzipFMPP = async (targetDir, file) => {
  console.log('Unzipping %s', file)
  const zip = new JSZip()
  const data = fs.readFileSync(file)
  const contents = await zip.loadAsync(data)
  for (const key of Object.keys(contents.files)) {
    const name = path.join(targetDir, key)
    const entry = zip.file(key)
    if (entry) {
      const content = await entry.async('nodebuffer')
      fs.writeFileSync(name, content, name.endsWith('/bin/fmpp') ? { mode: 0o755 } : {})
    } else if (!fs.existsSync(name)) {
      fs.mkdirSync(name)
    }
  }
}

const executeFMPP = async (version, exe, sourceDir, outputDir) => {
  const files = fs.readdirSync(sourceDir)
  for (const file of files) {
    const statFile = path.join(sourceDir, file)
    const stat = fs.statSync(statFile)

    if (stat.isDirectory() && file !== 'templates' && file !== 'target' && file !== 'images') {
      console.log('Processing folder %s', statFile)
      const outputGuideDir = path.join(outputDir, file)
      fs.mkdirSync(outputGuideDir)

      const files = fs.readdirSync(statFile)
      const adocFiles = files.filter(el => path.extname(el) === '.adoc')
      for (const adocFile of adocFiles) {
        console.log('Processing file %s', adocFile)
        const result = childProcess.spawnSync(exe, ['-S', sourceDir, '-O', outputDir,
          '-D', 'id:' + path.parse(adocFile).name + ',version:' + version,
          path.join(file, adocFile)])
        if (result.error) {
          throw result.error
        }
      }
    }
  }
}

const generateZipFromDirectory = async (zip, dir, root) => {
  const files = fs.readdirSync(dir)
  files.forEach(function (file) {
    file = path.resolve(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      generateZipFromDirectory(zip, file, root)
    } else {
      const filedata = fs.readFileSync(file)
      zip.file(path.relative(root, file), filedata)
    }
  })
}

const generateZip = async (zip, zipFile, dir, root) => {
  generateZipFromDirectory(zip, dir, root)
  const data = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  })
  console.log('Generating zip file %s', zipFile)
  fs.writeFileSync(zipFile, data)
}

const main = async (version) => {
  console.log('Generating guides for version %s', version)

  const fmppUrl = 'https://sourceforge.net/projects/fmpp/files/latest/download'
  const dir = path.dirname(url.fileURLToPath(import.meta.url))
  const targetDir = path.join(dir, 'target')
  const fmppZip = path.join(targetDir, 'fmpp.zip')
  const fmppExe = path.join(targetDir, 'fmpp', 'bin', 'fmpp')

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir)
  }

  let outputDir = path.join(targetDir, 'keycloak-nodejs-connect-guides-' + version)
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true })
  }
  fs.mkdirSync(outputDir)

  outputDir = path.join(outputDir, 'generated-guides')
  fs.mkdirSync(outputDir)

  await donwloadFMPP(fmppUrl, fmppZip)
  await unzipFMPP(targetDir, fmppZip)
  await executeFMPP(version, fmppExe, dir, outputDir)

  fs.cpSync(path.join(dir, 'images'), path.join(outputDir, 'images'), { recursive: true })
  fs.cpSync(path.join(dir, 'attributes.adoc'), path.join(outputDir, 'attributes.adoc'))

  const zipFile = path.join(targetDir, 'keycloak-nodejs-connect-guides.zip')
  generateZip(new JSZip(), zipFile, outputDir, targetDir)
}

if (process.argv.length !== 3) {
  console.log('Usage: node generate.js <version>')
  process.exit(1)
}

const version = process.argv[2]
main(version)
