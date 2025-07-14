// Script to restart the server with error tracking enabled
const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting server with error tracking enabled...');
console.log('');
console.log('📋 Error Tracking Features:');
console.log('   ✅ All system errors logged as notifications');
console.log('   ✅ Database connection issues tracked');
console.log('   ✅ Authentication failures logged');
console.log('   ✅ Performance issues monitored');
console.log('   ✅ Unhandled exceptions captured');
console.log('   ✅ Server startup/shutdown events logged');
console.log('');
console.log('🎯 All errors will appear in: Admin Panel > Notifications > System');
console.log('');

// Start the server
const serverProcess = spawn('node', ['app.js'], {
    cwd: __dirname,
    stdio: 'inherit'
});

serverProcess.on('close', (code) => {
    console.log(`\n🛑 Server process exited with code ${code}`);
});

serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
});