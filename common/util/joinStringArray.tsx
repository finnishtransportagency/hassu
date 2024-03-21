export const joinStringArray = (strArray: string[], separator = ", ", lastElementSeparator = separator) =>
  strArray.reduce((jointString, currentStr, index) => {
    if (index === 0) {
      jointString += currentStr;
    } else if (index < strArray.length - 1) {
      jointString += separator + currentStr;
    } else {
      jointString += lastElementSeparator + currentStr;
    }
    return jointString;
  }, "");
