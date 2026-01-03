import { useEffect, useRef, useState } from 'react';
import { Player } from './components/Player';
import { Chat } from './components/Chat';
import { Visualizer } from './components/Visualizer';
import { useWebSocket } from './hooks/useWebSocket';
import { useStrudelPlayer } from './hooks/useStrudelPlayer';
import { useTheme } from './hooks/useTheme';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';

function App() {
  const {
    connected,
    currentPattern,
    chatMessages,
    isGenerating,
    aiReasoning,
    listenerCount,
    patternFeedback,
    userVote,
    error,
    sendChat,
    sendVote,
  } = useWebSocket();

  const {
    error: strudelError,
    initialize,
    playPattern,
    stop,
  } = useStrudelPlayer();

  // Dynamic theming based on current pattern (applied via CSS custom properties)
  const { theme } = useTheme(currentPattern);

  // Audio visualization
  const { audioData, isAnalyzing, startAnalyzing, stopAnalyzing } = useAudioAnalyzer();

  const [hasStarted, setHasStarted] = useState(false);
  const lastPatternIdRef = useRef<string | null>(null);

  // Play new patterns when they arrive
  useEffect(() => {
    if (currentPattern && hasStarted && currentPattern.id !== lastPatternIdRef.current) {
      lastPatternIdRef.current = currentPattern.id;
      playPattern(currentPattern.patternCode);
    }
  }, [currentPattern, hasStarted, playPattern]);

  const handleStart = async () => {
    await initialize();
    setHasStarted(true);
    startAnalyzing();
    if (currentPattern) {
      playPattern(currentPattern.patternCode);
    }
  };

  const handleStop = () => {
    stop();
    stopAnalyzing();
    setHasStarted(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Background visualizer */}
      <div className="fixed inset-0 z-0">
        <Visualizer
          audioData={audioData}
          isActive={hasStarted && isAnalyzing}
          mode="bars"
          themeColor={theme.primary}
        />
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            Infinite Radio
          </h1>
          <p className="text-gray-400 mt-2">
            24/7 AI-generated music powered by Claude & Strudel
          </p>
        </header>

        {/* Connection status */}
        {!connected && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 text-yellow-300 text-center">
            Connecting to radio station...
          </div>
        )}

        {(error || strudelError) && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-300 text-center">
            {error || strudelError}
          </div>
        )}

        {/* Player */}
        <Player
          hasStarted={hasStarted}
          listenerCount={listenerCount}
          isGenerating={isGenerating}
          aiReasoning={aiReasoning}
          currentPattern={currentPattern}
          patternFeedback={patternFeedback}
          userVote={userVote}
          onStart={handleStart}
          onStop={handleStop}
          onVote={(value) => currentPattern && sendVote(currentPattern.id, value)}
        />

        {/* Main content grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column: Chat */}
          <Chat
            messages={chatMessages}
            onSendMessage={sendChat}
            disabled={!connected}
          />

          {/* Right column: Pattern Info */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Current Pattern
            </h3>
            {currentPattern ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-purple-600/50 rounded text-sm text-purple-200">
                    {currentPattern.style}
                  </span>
                  <span className="px-2 py-1 bg-blue-600/50 rounded text-sm text-blue-200">
                    {currentPattern.key} {currentPattern.mode}
                  </span>
                  <span className="px-2 py-1 bg-green-600/50 rounded text-sm text-green-200">
                    {currentPattern.tempo} BPM
                  </span>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{currentPattern.patternCode}</pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Waiting for first pattern...
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm pt-8">
          <p>Powered by Claude & Strudel</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
