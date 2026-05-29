import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10).then((hash) => {
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('\nUse this hash in your SQL migration file.');
});

