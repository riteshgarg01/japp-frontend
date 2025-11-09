import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function clamp(value, min, max){
  return Math.min(max, Math.max(min, value));
}

export function Slider({ value = [0, 100], onValueChange, min = 0, max = 100, step = 1 }){
  const trackRef = useRef(null);
  const [internal, setInternal] = useState(value);

  useEffect(()=>{
    if (!Array.isArray(value) || value.length < 2) return;
    setInternal(prev => (prev[0] === value[0] && prev[1] === value[1] ? prev : value));
  }, [value]);

  const range = useMemo(()=> Math.max(0.0001, max - min), [max, min]);

  const snap = useCallback((val)=>{
    if (!Number.isFinite(step) || step <= 0) return clamp(val, min, max);
    const offset = val - min;
    const snapped = Math.round(offset / step) * step + min;
    return clamp(snapped, min, max);
  }, [min, max, step]);

  const commitValue = useCallback((index, nextVal)=>{
    setInternal(prev => {
      if (!Array.isArray(prev) || prev.length < 2) return prev;
      const next = [...prev];
      if (index === 0){
        next[0] = Math.min(nextVal, next[1]);
      } else {
        next[1] = Math.max(nextVal, next[0]);
      }
      if (onValueChange){
        onValueChange([next[0], next[1]]);
      }
      return next;
    });
  }, [onValueChange]);

  const updateFromClientX = useCallback((index, clientX)=>{
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const raw = min + ratio * range;
    const snapped = snap(raw);
    commitValue(index, snapped);
  }, [commitValue, min, range, snap]);

  const startDrag = useCallback((index)=>(event)=>{
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    const move = (e)=>{
      if (pointerId != null && e.pointerId !== pointerId) return;
      updateFromClientX(index, e.clientX);
    };
    const up = (e)=>{
      if (pointerId != null && e.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    updateFromClientX(index, event.clientX);
  }, [updateFromClientX]);

  const handleKeyDown = useCallback((index)=>(event)=>{
    const keyMap = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -10,
      PageUp: 10,
      Home: 'min',
      End: 'max',
    };
    if (!(event.key in keyMap)) return;
    event.preventDefault();
    event.stopPropagation();
    const current = internal[index] ?? min;
    const command = keyMap[event.key];
    if (command === 'min'){
      commitValue(index, index === 0 ? min : internal[0]);
      return;
    }
    if (command === 'max'){
      commitValue(index, index === 0 ? internal[1] : max);
      return;
    }
    const delta = (step || 1) * command;
    commitValue(index, clamp(current + delta, min, max));
  }, [commitValue, internal, min, max, step]);

  const percentages = useMemo(()=>{
    const lower = clamp(internal[0] ?? min, min, max);
    const upper = clamp(internal[1] ?? max, min, max);
    return [((lower - min) / range) * 100, ((upper - min) / range) * 100];
  }, [internal, min, max, range]);

  return (
    <div className="relative h-6 select-none touch-none" ref={trackRef}>
      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-neutral-200" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/60"
        style={{ left: `${percentages[0]}%`, width: `${Math.max(0, percentages[1] - percentages[0])}%` }}
      />
      {[0, 1].map((index) => {
        const percent = percentages[index];
        const ariaValue = internal[index];
        return (
          <button
            key={index}
            type="button"
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 -ml-2 rounded-full border border-neutral-400 bg-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            style={{ left: `${percent}%` }}
            onPointerDown={startDrag(index)}
            onKeyDown={handleKeyDown(index)}
            aria-valuemin={index === 0 ? min : internal[0]}
            aria-valuemax={index === 0 ? internal[1] : max}
            aria-valuenow={ariaValue}
            role="slider"
            aria-label={index === 0 ? 'Minimum price' : 'Maximum price'}
            tabIndex={0}
          />
        );
      })}
    </div>
  );
}

export default Slider;
