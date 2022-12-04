import * as React from "react";

function getPosition(e) {
  const obj = "touches" in e ? e.touches[0] : e;
  return {
    pageX: obj.pageX,
    pageY: obj.pageY,
  };
}

export default function useDrag(
  containerRef,
  direction,
  rawValues,
  min,
  max,
  formatValue,
  triggerChange,
  finishChange,
  offsetValues
) {
  const [draggingValue, setDraggingValue] = React.useState(null);
  const [draggingIndex, setDraggingIndex] = React.useState(-1);
  const [cacheValues, setCacheValues] = React.useState(rawValues);
  const [originValues, setOriginValues] = React.useState(rawValues);
  const mouseMoveEventRef = React.useRef(null);
  const mouseUpEventRef = React.useRef(null);
  React.useEffect(() => {
    if (draggingIndex === -1) {
      setCacheValues(rawValues);
    }
  }, [rawValues, draggingIndex]);
  React.useEffect(
    () => () => {
      document.removeEventListener("mousemove", mouseMoveEventRef.current);
      document.removeEventListener("mouseup", mouseUpEventRef.current);
      document.removeEventListener("touchmove", mouseMoveEventRef.current);
      document.removeEventListener("touchend", mouseUpEventRef.current);
    },
    []
  );

  const flushValues = (nextValues, nextValue) => {
    if (cacheValues.some((val, i) => val !== nextValues[i])) {
      if (nextValue !== undefined) {
        setDraggingValue(nextValue);
      }

      setCacheValues(nextValues);
      triggerChange(nextValues);
    }
  };

  const updateCacheValue = (valueIndex, offsetPercent) => {
    if (valueIndex === -1) {
      const startValue = originValues[0];
      const endValue = originValues[originValues.length - 1];
      const maxStartOffset = min - startValue;
      const maxEndOffset = max - endValue;
      let offset = offsetPercent * (max - min);
      offset = Math.max(offset, maxStartOffset);
      offset = Math.min(offset, maxEndOffset);
      const formatStartValue = formatValue(startValue + offset);
      offset = formatStartValue - startValue;
      const cloneCacheValues = originValues.map((val) => val + offset);
      flushValues(cloneCacheValues);
    } else {
      const offsetDist = (max - min) * offsetPercent;
      const cloneValues = [...cacheValues];
      cloneValues[valueIndex] = originValues[valueIndex];
      const next = offsetValues(cloneValues, offsetDist, valueIndex, "dist");
      flushValues(next.values, next.value);
    }
  };

  const updateCacheValueRef = React.useRef(updateCacheValue);
  updateCacheValueRef.current = updateCacheValue;

  const onStartMove = (e, valueIndex) => {
    e.stopPropagation();
    const originValue = rawValues[valueIndex];
    setDraggingIndex(valueIndex);
    setDraggingValue(originValue);
    setOriginValues(rawValues);
    const { pageX: startX, pageY: startY } = getPosition(e);

    const onMouseMove = (event) => {
      event.preventDefault();
      const { pageX: moveX, pageY: moveY } = getPosition(event);
      const offsetX = moveX - startX;
      const offsetY = moveY - startY;
      const { width, height } = containerRef.current.getBoundingClientRect();
      let offSetPercent;
      if (direction === 'ltr') offSetPercent = offsetX / width
      updateCacheValueRef.current(valueIndex, offSetPercent);
    };

    const onMouseUp = (event) => {
      event.preventDefault();
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchend", onMouseUp);
      document.removeEventListener("touchmove", onMouseMove);
      mouseMoveEventRef.current = null;
      mouseUpEventRef.current = null;
      setDraggingIndex(-1);
      finishChange();
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchend", onMouseUp);
    document.addEventListener("touchmove", onMouseMove);
    mouseMoveEventRef.current = onMouseMove;
    mouseUpEventRef.current = onMouseUp;
  };

  const returnValues = React.useMemo(() => {
    const sourceValues = [...rawValues].sort((a, b) => a - b);
    const targetValues = [...cacheValues].sort((a, b) => a - b);
    return sourceValues.every((val, index) => val === targetValues[index])
      ? cacheValues
      : rawValues;
  }, [rawValues, cacheValues]);
  return [draggingIndex, draggingValue, returnValues, onStartMove];
}
