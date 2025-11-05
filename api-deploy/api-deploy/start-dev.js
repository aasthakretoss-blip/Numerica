#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor de desarrollo local...\n');

// Comando para ejecutar el servidor
const serverProcess = spawn('node', ['server-local.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Manejar la terminación del proceso
serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`\n❌ Servidor terminó con código ${code}`);
  } else {
    console.log('\n✅ Servidor terminado correctamente');
  }
});

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...');
  serverProcess.kill('SIGTERM');
});
