import React, { ChangeEventHandler, KeyboardEventHandler } from "react";
import { useState } from "react";

interface Props {
  value: string;
  setValue: (value: string) => void;
  invalid?: boolean;
  errorMessage?: string;
  suggestionHandler: (textInput: string) => any[];
  itemText: (item: any[]) => string[];
}

export default function AutoComplete({
  suggestionHandler,
  itemText,
  value,
  setValue,
  invalid: invalid,
  errorMessage,
}: Props) {
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionList, setSuggestionList] = useState<string[]>([]);
  const [ignoreBlur, setIgnoreBlur] = useState(false);

  const onChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const currentValue = event.target.value;
    setSuggestionsVisible(true);
    setActiveIndex(-1);
    setValue(currentValue);
    setSuggestionList(itemText(suggestionHandler(currentValue)).slice(0, 5));
  };

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    const key = event.key;

    // Only handle these keydown events
    if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(key)) return;

    // Prevent default functionality from ["ArrowDown", "ArrowUp", "Enter", "Escape"] so that enter won't move to next field in the form
    event.preventDefault();

    if (key === "Enter" || key === "Escape") {
      setSuggestionsVisible(false);
      return;
    }

    // Check if suggestionsVisible is true so that suggestions won't be changed when pressing Up or Down while the suggestions are hidden
    if (suggestionsVisible && suggestionList.length > 0) {
      let newIndex = activeIndex;

      if (key === "ArrowDown") {
        if (activeIndex < suggestionList.length - 1) {
          newIndex = activeIndex + 1;
        } else {
          newIndex = 0;
        }
      } else if (key === "ArrowUp") {
        if (activeIndex > 0) {
          newIndex = activeIndex - 1;
        } else {
          newIndex = suggestionList.length - 1;
        }
      }
      setActiveIndex(newIndex);
      setValue(suggestionList[newIndex]);
    }
  };

  const handleBlur = () => {
    if (ignoreBlur) return;
    setSuggestionsVisible(false);
  };

  return (
    <>
      <div
        className="position-relative d-inline-block w-100"
        onMouseDown={() => setIgnoreBlur(true)}
        onMouseUp={() => setIgnoreBlur(false)}
      >
        <input
          type="text"
          className={`form-control w-100 ${invalid && `is-invalid`}`}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          value={value || ""}
          onChange={onChange}
        />
        {suggestionsVisible && (
          <div className="position-absolute list-group bg-white w-100">
            {suggestionList.map((suunnitelma, index) => (
              <button
                className={`list-group-item list-group-item-action ${activeIndex === index && `active`}`}
                style={{ zIndex: 9999 }}
                key={index}
                onClick={() => {
                  setValue(suunnitelma);
                  setSuggestionsVisible(false);
                }}
              >
                {suunnitelma}
              </button>
            ))}
          </div>
        )}
        <div className="invalid-feedback">{errorMessage}</div>
      </div>
    </>
  );
}
