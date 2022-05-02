import FormGroup from "./FormGroup";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { FieldError } from "react-hook-form";
import useOutsideClickDetection from "../../hooks/useOutsideClickDetection";
export interface Props<T> {
  error?: FieldError;
  label?: string;
  disabled?: boolean;
  hideErrorMessage?: boolean;
  options: T[] | ((query: string) => Promise<T[]> | T[]);
  getOptionLabel: (option: T) => string;
  onSelect?: (option: T | null) => void;
  clearOnBlur?: boolean;
  optionFetchDelay?: number;
  loading?: boolean;
  maxResults?: number;
  initialOption?: T;
  minSearchLength?: number;
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
  optionFetchDelay: onTextChangeDelay = 300,
  loading,
  maxResults = 60,
  initialOption,
  minSearchLength = 0,
}: Props<T>) => {
  const [textValue, setTextValue] = useState("");
  const [isOnFocus, setIsOnFocus] = useState(false);
  const [selectedOption, setSelectedOption] = useState<T | null | undefined>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const focus = () => setIsOnFocus(true);
  const blur = () => setIsOnFocus(false);
  const [showOptions, setShowOptions] = useState(false);
  const show = () => setShowOptions(true);
  const hide = useCallback(() => {
    setShowOptions(false);
    setCurrentIndex(-1);
  }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideClickDetection(wrapperRef, hide);
  const [filteredOptions, setFilteredOptions] = useState<T[]>(Array.isArray(propOptions) ? propOptions : []);
  const optionsRef = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const slicedOptions = useMemo(() => {
    return filteredOptions?.slice(0, maxResults) || [];
  }, [filteredOptions, maxResults]);

  const getNextIndex = () => (currentIndex < slicedOptions.length - 1 ? currentIndex + 1 : 0);
  const getPrevIndex = () => (currentIndex > 0 ? currentIndex - 1 : slicedOptions.length - 1);

  useEffect(() => {
    optionsRef.current = optionsRef.current.slice(0, slicedOptions.length);
  }, [slicedOptions]);

  const inputChanged: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const inputValue = event.target.value;
    setTextValue(inputValue);
    show();
    focus();
  };

  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Set timer to fetch options if options is not given
  useEffect(() => {
    let myTimer : NodeJS.Timeout | null = null;
    if (!Array.isArray(propOptions)) {
      setFetchingUsers(true);
      myTimer = setTimeout(async () => {
        const result = await propOptions(textValue);
        setFetchingUsers(false);
        setFilteredOptions(result);
      }, onTextChangeDelay);
    }
    return () => {
      if (myTimer) clearTimeout(myTimer);
    }
  }, [textValue, propOptions, setFetchingUsers, setFilteredOptions, onTextChangeDelay]);

  // Set filteredOptions if options is given
  useEffect(() => {
    if (Array.isArray(propOptions)) {
      setFilteredOptions(
        propOptions.filter((option) => getOptionLabel(option).toLowerCase().includes(textValue.toLowerCase()))
      );
    }
  }, [propOptions, setFilteredOptions, getOptionLabel, textValue]);

  const setOptionValue = useCallback(
    (optionValue: T | null | undefined) => {
      if (optionValue) {
        let newValue = getOptionLabel(optionValue);
        if (textValue !== newValue) {
          setTextValue(newValue);
        }
      }
      setSelectedOption(optionValue);
      hide();
    },
    [hide, getOptionLabel, textValue]
  );

  const updateOption = (option: T | null) => {
    if (selectedOption !== option) {
      onSelect?.(option);
    }
    setOptionValue(option);
  };

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (!initDone && initialOption) {
      setOptionValue(initialOption);
      setInitDone(true);
    }
  }, [initialOption, initDone, setInitDone, setOptionValue]);

  const changeIndex = (index: number) => {
    const child = optionsRef.current[index];
    const parent = listRef.current;
    if (child && parent) {
      scrollIntoViewIfNeeded(child, parent);
    }
    setCurrentIndex(index);
  };

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
    const isViewable =
      childRect.top >= parentRect.top && childRect.bottom <= parentRect.top + parentViewableArea.height;

    // if you can't see the child try to scroll parent
    if (!isViewable) {
      const scrollTop = childRect.top - parentRect.top;
      const scrollBottom = childRect.bottom - parentRect.bottom;
      // scroll by offset relative to parent
      if (Math.abs(scrollTop) < Math.abs(scrollBottom)) {
        parent.scrollTop += scrollTop;
      } else {
        parent.scrollTop += scrollBottom;
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
                changeIndex(getPrevIndex());
                break;
              case "ArrowDown":
                event.preventDefault();
                changeIndex(getNextIndex());
                break;
              case "Enter":
                event.preventDefault();
                updateOption(slicedOptions[currentIndex]);
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
        {textValue.length >= minSearchLength && showOptions && (
          <div ref={listRef} className="max-h-96 bg-white absolute overflow-y-auto w-full border shadow-lg z-10">
            {loading || fetchingUsers ? (
              "Ladataan..."
            ) : slicedOptions.length > 0 ? (
              <ul>
                {slicedOptions.map((option, index) => (
                  <li
                    key={index}
                    ref={(el) => (optionsRef.current[index] = el)}
                    className={`cursor-default px-2 truncate-ellipsis ${
                      index === currentIndex ? "bg-primary text-white" : ""
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      updateOption(option);
                    }}
                    onMouseEnter={() => {
                      setCurrentIndex(index);
                    }}
                  >
                    {getOptionLabel(option)}
                  </li>
                ))}
              </ul>
            ) : (
              "Ei hakutuloksia"
            )}
          </div>
        )}
      </div>
    </FormGroup>
  );
};

export default Autocomplete;
