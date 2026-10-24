/** Slowly drifting aurora whose colors follow the time of day (see [data-phase] in styles.css). */
export function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="grain" />
    </div>
  );
}
