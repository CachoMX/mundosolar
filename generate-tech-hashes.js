// Run this to generate password hashes for technicians
// Usage: node generate-tech-hashes.js

const bcrypt = require('bcryptjs');

const password = 'tech123';
const hashes = [];

console.log('Generating 5 password hashes for: tech123\n');

for (let i = 0; i < 5; i++) {
  const hash = bcrypt.hashSync(password, 10);
  hashes.push(hash);
  console.log(`Hash ${i + 1}: ${hash}`);
}

console.log('\n✅ Copy these hashes to seed-technicians.sql');
console.log('Replace $2a$10$YourHashedPasswordHere1, $2a$10$YourHashedPasswordHere2, etc.');
