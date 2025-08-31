function measureTextWidth(text, fontSize, fontWeight) {
  const measure = document.createElement('span')
  measure.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-size: ${fontSize};
    font-weight: ${fontWeight};
  `
  measure.textContent = text
  document.body.appendChild(measure)
  const width = measure.offsetWidth
  document.body.removeChild(measure)
  return width
}

export { measureTextWidth }
