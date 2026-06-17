function ok(data, meta) {
  return { success: true, data, error: null, ...(meta && { meta }) };
}

function fail(error, meta) {
  return { success: false, data: null, error, ...(meta && { meta }) };
}

module.exports = { ok, fail };
