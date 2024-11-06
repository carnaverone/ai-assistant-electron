function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function sanitizeInput(input) {
  return input.replace(/[<>]/g, '');
}

module.exports = {
  formatDate,
  sanitizeInput,
};

