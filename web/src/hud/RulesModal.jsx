import { TARGET_SCORE } from '@core/constants';
import Modal from './Modal';

export default function RulesModal({ onClose }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <h3>Free-for-all</h3>
      <p>Everyone plays one card at the same time, 13 times. A card of your own element is a trump: any trump beats every non-trump, and otherwise the highest card wins. Whoever wins the most tricks becomes King.</p>
      <h3>Skirmish</h3>
      <p>If players tie for the most tricks, they replay a mini free-for-all using only the cards they won. If you're not in it, you watch it play out.</p>
      <h3>Rebellion</h3>
      <p>The King gets 21 cards and attacks all three lanes each duel. Each rebel defends one lane with 7 cards. Own element beats off-element; if both cards are the same kind, the higher rank wins. On equal ranks, playing into the opponent's element loses. First side to 4 duels wins. A King who holds the crown scores points, doubled for every consecutive hold.</p>
      <h3>Winning</h3>
      <p>First to {TARGET_SCORE} points wins the war.</p>
      <h3>Keyboard</h3>
      <p>← → choose a card · 1 2 3 place a King's card in a lane · Enter play / continue · Esc close · ` dev tools</p>
    </Modal>
  );
}
