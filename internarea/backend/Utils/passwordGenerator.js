// Password Generator - Generate random passwords with only uppercase and lowercase letters
function generatePassword(length = 12) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const allChars = uppercase + lowercase;
  let password = "";

  for (let i = 0; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password;
}

module.exports = {
  generatePassword,
};
