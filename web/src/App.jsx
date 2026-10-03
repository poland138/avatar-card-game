import { useReducer } from 'react';
import { gameReducer, initialState } from '@core/reducer';
import ElementSelectScreen from './screens/ElementSelectScreen';
import UpgradeScreen from './screens/UpgradeScreen';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  if (state.phase === 'element-select') {
    return <ElementSelectScreen xp={state.xp} onSelect={element => dispatch({ type: 'SELECT_ELEMENT', element })} />;
  }
  if (state.phase === 'upgrades') {
    return (
      <UpgradeScreen
        element={state.chosenElement}
        xp={state.xp[state.chosenElement] || 0}
        onBegin={() => dispatch({ type: 'START_GAME' })}
        onBack={() => dispatch({ type: 'BACK_TO_SELECT' })}
      />
    );
  }
  return (
    <main className="screen">
      <h1>{state.phase}</h1>
      <p className="subtitle">The game table is added in Task 7.</p>
    </main>
  );
}
