// VenomSpeechCore.ts - Global Speech Controller holding warmed-up SpeechRecognition instance
// Ensures the instance created during the click gesture survives page navigation.

let activeWakeWordInstance: any = null;

export const initializeVenomEngineOnClick = () => {
  if (typeof window === 'undefined') return null;
  
  // 1. Check if already initialized to prevent double allocation
  if (activeWakeWordInstance) return activeWakeWordInstance;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("Web Speech API is unsupported in this browser layer.");
    return null;
  }

  try {
    // 2. Instantiate the engine directly within the click execution thread
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Cache the instance globally
    activeWakeWordInstance = recognition;
    return recognition;
  } catch (err) {
    console.error("Failed to initialize Venom Speech Engine on click", err);
    return null;
  }
};

export const getVenomEngineInstance = () => {
  return activeWakeWordInstance;
};
