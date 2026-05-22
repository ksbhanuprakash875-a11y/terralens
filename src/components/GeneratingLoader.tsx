import "./GeneratingLoader.css";

const LETTERS = "Generating".split("");

const GeneratingLoader = () => (
  <div className="loader-wrapper">
    {LETTERS.map((letter, i) => (
      <span key={i} className="loader-letter">{letter}</span>
    ))}
    <div className="loader" />
  </div>
);

export default GeneratingLoader;
