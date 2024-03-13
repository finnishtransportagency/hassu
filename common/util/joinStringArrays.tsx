export const joinStringArrays = (strArray: string[], separator = ", ", lastElementSeparator = separator) => {
  const lastElement = strArray.pop();
  if (strArray.length === 0) {
    return lastElement;
  } else {
    return strArray.join(separator) + lastElementSeparator + lastElement;
  }
};
