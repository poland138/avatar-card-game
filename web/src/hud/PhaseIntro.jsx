import Modal from './Modal';

export default function PhaseIntro({ intro, onClose }) {
  return (
    <Modal title={intro.title} onClose={onClose} closeLabel="Got it">
      <p>{intro.body}</p>
      <p className="rule">{intro.rule}</p>
    </Modal>
  );
}
