const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'node_modules', '@prisma', 'client', 'generator-build', 'index.js'),
  path.join(__dirname, '..', 'node_modules', 'prisma', 'prisma-client', 'generator-build', 'index.js')
];

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('// PATCHED_EPERM_GUARD')) {
    console.log(`Already patched: ${filePath}`);
    continue;
  }

  const oldCode = `    let tempPath = \`\${targetPath}.tmp\${process.pid}\`;
    await import_fs.default.promises.copyFile(sourcePath, tempPath);
    await import_fs.default.promises.rename(tempPath, targetPath);`;

  const newCode = `    let tempPath = \`\${targetPath}.tmp\${process.pid}\`;
    await import_fs.default.promises.copyFile(sourcePath, tempPath);
    // PATCHED_EPERM_GUARD
    try {
      await import_fs.default.promises.rename(tempPath, targetPath);
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY') && import_fs.default.existsSync(targetPath)) {
        try { await import_fs.default.promises.unlink(tempPath); } catch (_) {}
      } else {
        throw err;
      }
    }`;

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully patched: ${filePath}`);
  } else {
    console.log(`Pattern not matched in: ${filePath}`);
  }
}
