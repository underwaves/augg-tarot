const fs = require('fs');
const path = require('path');

// 1. Auto-switch Prisma schema provider based on DATABASE_URL
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  let dbUrl = (process.env.DATABASE_URL || '').trim();
  if (!dbUrl) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match) dbUrl = match[1].trim();
    }
  }

  let schema = fs.readFileSync(schemaPath, 'utf8');
  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    if (schema.includes('provider = "sqlite"')) {
      console.log('🔄 Detected PostgreSQL in DATABASE_URL. Switching Prisma provider to postgresql...');
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
      fs.writeFileSync(schemaPath, schema, 'utf8');
    }
  } else if (dbUrl.startsWith('file:') || !dbUrl) {
    if (schema.includes('provider = "postgresql"')) {
      console.log('🔄 Detected SQLite in DATABASE_URL. Switching Prisma provider to sqlite...');
      schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
      fs.writeFileSync(schemaPath, schema, 'utf8');
    }
  }
}

// 2. Patch EPERM rename race condition in Prisma generator-build
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
