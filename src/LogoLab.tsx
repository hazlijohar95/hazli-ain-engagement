import { HoopMark } from "./logo/HoopMark";

/** Dev-only inspection board for the logo (/logo): the illustration and the icon cut, large and at real sizes. */
export default function LogoLab() {
  return (
    <div className="lab">
      <section className="lab-card">
        <h2 className="lab-title">Embroidery hoop · full</h2>
        <div className="lab-row">
          <HoopMark size={480} className="lab-board" />
        </div>
        <div className="lab-row">
          {[176, 96, 64].map((s) => (
            <HoopMark key={s} size={s} className="lab-board" />
          ))}
        </div>
      </section>
      <section className="lab-card">
        <h2 className="lab-title">Embroidery hoop · icon</h2>
        <div className="lab-row">
          {[180, 64, 32, 16].map((s) => (
            <HoopMark key={s} size={s} variant="icon" className="lab-board" />
          ))}
        </div>
      </section>
    </div>
  );
}
