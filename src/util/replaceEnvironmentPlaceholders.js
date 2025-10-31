
function replaceEnvironmentPlaceholders(content, env) {
  return content.replace(/_NEXT_PUBLIC_[A-Z0-9_]+_/g, (match) => {
    const key = match.slice(1, -1); // Remove leading and trailing underscores
    const value = env[key];
    return value !== undefined ? value : match;
  });
}

module.exports = replaceEnvironmentPlaceholders;