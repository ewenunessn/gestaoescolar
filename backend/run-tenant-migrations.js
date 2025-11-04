#!/usr/bin/env node

/**
 * Tenant Migration Runner Script
 * Wrapper script to run tenant migrations with proper environment setup
 */

const { spawn } = require('child_process');
const path = require('path');

// Ensure environment is loaded
require('dotenv').config();

// Build TypeScript if needed
const fs = require('fs');
const distPath = path.join(__dirname, 'dist');

if (!fs.existsSync(distPath)) {
  console.log('🔨 Building TypeScript files...');
  const buildProcess = spawn('npm', ['run', 'build'], { 
    stdio: 'inherit',
    cwd: __dirname
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      runMigrationCli();
    } else {
      console.error('❌ Build failed');
      process.exit(1);
    }
  });
} else {
  runMigrationCli();
}

function runMigrationCli() {
  // Run the compiled CLI
  const cliPath = path.join(__dirname, 'dist', 'cli', 'tenantMigrationCli.js');
  const args = process.argv.slice(2);
  
  const cliProcess = spawn('node', [cliPath, ...args], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  cliProcess.on('close', (code) => {
    process.exit(code);
  });
  
  cliProcess.on('error', (error) => {
    console.error('❌ Error running migration CLI:', error.message);
    process.exit(1);
  });
}