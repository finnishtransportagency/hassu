import FormGroup from "@components/form/FormGroup";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FieldError } from "react-hook-form";
import useOutsideClickDetection from "../../hooks/useOutsideClickDetection";

interface Props<T> {
  error?: FieldError;
  label?: string;
  disabled?: boolean;
  hideErrorMessage?: boolean;
  options: T[];
  getOptionLabel: (option: T) => string;
  onSelect?: (option: T | null) => void;
  clearOnBlur?: boolean;
  onTextChange?: (query: string) => void;
  onTextChangeDelay?: number;
  loading?: boolean;
  maxResults?: number;
  selectedOption?: T;
}

const Autocomplete = <T extends unknown>({
  error,
  label,
  disabled,
  hideErrorMessage,
  options: propOptions,
  getOptionLabel,
  onSelect,
  clearOnBlur,
  onTextChange,
  onTextChangeDelay = 800,
  loading,
  maxResults = 60,
  selectedOption: value,
}: Props<T>) => {
  const [textValue, setTextValue] = useState("");
  const [isOnFocus, setIsOnFocus] = useState(false);
  const [selectedOption, setSelectedOption] = useState<T | null | undefined>(null);
  const [pointedOptionIndex, setPointedOptionIndex] = useState(-1);
  const focus = () => setIsOnFocus(true);
  const blur = () => setIsOnFocus(false);
  const [showOptions, setShowOptions] = useState(false);
  const show = () => setShowOptions(true);
  const hide = useCallback(() => {
    setShowOptions(false);
    setPointedOptionIndex(-1);
  }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideClickDetection(wrapperRef, hide);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [filteredOptions, setFilteredOptions] = useState<T[]>(propOptions);
  const optionsRef = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const options = onTextChange ? propOptions.slice(0, maxResults) : filteredOptions.slice(0, maxResults);

  useEffect(() => {
    optionsRef.current = optionsRef.current.slice(0, options.length);
  }, [options]);

  const inputChanged: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const inputValue = event.target.value;
    setTextValue(inputValue);
    if (onTextChange) {
      if (timer) {
        clearTimeout(timer);
      }
      const newTimer = setTimeout(() => {
        onTextChange(inputValue);
      }, onTextChangeDelay);
      setTimer(newTimer);
    }
    show();
    focus();
  };

  useEffect(() => {
    setFilteredOptions(
      propOptions.filter((option) => getOptionLabel(option).toLowerCase().includes(textValue.toLowerCase()))
    );
  }, [textValue, getOptionLabel, propOptions]);

  const setOptionValue = useCallback(
    (optionValue: T | null | undefined) => {
      if (optionValue) {
        setTextValue(getOptionLabel(optionValue));
      }
      setSelectedOption(optionValue);
      hide();
    },
    [hide, getOptionLabel]
  );

  const updateOption = (option: T | null) => {
    setOptionValue(option);
    onSelect?.(option);
  };

  useEffect(() => {
    setOptionValue(value);
  }, [value, setOptionValue]);

  function scrollIntoViewIfNeeded(child: HTMLElement, parent: HTMLElement) {
    // Where is the parent on page
    const parentRect = parent.getBoundingClientRect();
    // What can you see?
    const parentViewableArea = {
      height: parent.clientHeight,
      width: parent.clientWidth,
    };

    // Where is the child
    const childRect = child.getBoundingClientRect();
    // Is the child viewable?
    const isViewable = childRect.top >= parentRect.top && childRect.top <= parentRect.top + parentViewableArea.height;

    // if you can't see the child try to scroll parent
    if (!isViewable) {
      // scroll by offset relative to parent
      if (childRect.top >= parentRect.top) {
        parent.scrollTop = parent.scrollTop + childRect.height;
      } else {
        parent.scrollTop = parent.scrollTop + childRect.top - parentRect.top;
      }
    }
  }

  return (
    <FormGroup label={label} errorMessage={hideErrorMessage ? undefined : error?.message}>
      <div className="relative" ref={wrapperRef}>
        <input
          type="text"
          value={textValue}
          disabled={disabled}
          className={error && "error"}
          onChange={inputChanged}
          onKeyDown={(event) => {
            switch (event.key) {
              case "Tab":
                hide();
                break;
              case "Escape":
                hide();
                blur();
                break;
              case "ArrowUp":
                event.preventDefault();
                if (pointedOptionIndex > 0) {
                  const newIndex = pointedOptionIndex - 1;
                  const child = optionsRef.current[newIndex];
                  const parent = listRef.current;
                  if (child && parent) {
                    scrollIntoViewIfNeeded(child, parent);
                  }
                  setPointedOptionIndex(newIndex);
                }
                break;
              case "ArrowDown":
                event.preventDefault();
                if (pointedOptionIndex < options.length - 1) {
                  const newIndex = pointedOptionIndex + 1;
                  const child = optionsRef.current[newIndex];
                  const parent = listRef.current;
                  if (child && parent) {
                    scrollIntoViewIfNeeded(child, parent);
                  }
                  setPointedOptionIndex(newIndex);
                }
                break;
              case "Enter":
                event.preventDefault();
                updateOption(options[pointedOptionIndex]);
                break;
            }
          }}
          onFocus={focus}
          onClick={() => {
            if (!isOnFocus) {
              show();
            } else {
              setShowOptions(!showOptions);
            }
          }}
          onBlur={() => {
            if (selectedOption && textValue !== getOptionLabel(selectedOption)) {
              updateOption(null);
              if (clearOnBlur) {
                setTextValue("");
              }
            }
            blur();
          }}
        />
        {showOptions && (
          <div ref={listRef} className="max-h-96 bg-white absolute overflow-y-auto w-full border shadow-lg z-10">
            {loading ? (
              "LOADING..."
            ) : options.length > 0 ? (
              <ul>
                {options.map((option, index) => (
                  <li
                    key={index}
                    ref={(el) => (optionsRef.current[index] = el)}
                    className={`cursor-default px-2 ${index === pointedOptionIndex ? "bg-primary text-white" : ""}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      updateOption(option);
                    }}
                    onMouseEnter={() => {
                      setPointedOptionIndex(index);
                    }}
                  >
                    {getOptionLabel(option)}
                  </li>
                ))}
              </ul>
            ) : (
              "No results"
            )}
          </div>
        )}
      </div>
    </FormGroup>
  );
};

export default Autocomplete;
