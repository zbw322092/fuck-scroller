/**
 * @t is the current time (or position) of the tween. This can be seconds or frames, steps, seconds, ms, whatever – as long as the unit is the same as is used for the total time [3].
 * @b is the beginning value of the property.
 * @c is the change between the beginning and destination value of the property.
 * @d is the total time of the tween.
 */

const easeInOutQuad = (t, b, c, d) => {
  t /= d / 2
  if (t < 1) return c / 2 * t * t + b
  t--
  return -c / 2 * (t * (t - 2) - 1) + b
}

export default easeInOutQuad