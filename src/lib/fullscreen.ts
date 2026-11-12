type ExtendedScreen = Screen & { isPrimary?: boolean };
type ScreenDetails = { screens: ExtendedScreen[]; currentScreen: ExtendedScreen };
type MultiScreenWindow = Window & { getScreenDetails?: () => Promise<ScreenDetails> };
type ScreenFullscreenOptions = FullscreenOptions & { screen?: ExtendedScreen };

export async function requestPresentationFullscreen(preferSecondary = false): Promise<void> {
  if (document.fullscreenElement) return;
  const request = document.documentElement.requestFullscreen?.bind(document.documentElement);
  if (!request) throw new Error("Fullscreen is unavailable in this browser; presentation will use this window.");
  if (!preferSecondary || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    try {
      await request();
      return;
    } catch {
      throw new Error("Fullscreen is unavailable in this browser; presentation will use this window.");
    }
  }
  try {
    const details = await (window as MultiScreenWindow).getScreenDetails?.();
    const secondary = details?.screens.find((screen) => screen !== details.currentScreen);
    if (secondary) {
      try {
        await request({ screen: secondary } as ScreenFullscreenOptions);
        return;
      } catch {
        // Fall back to the current display if secondary-screen fullscreen is denied.
      }
    }
    await request();
  } catch {
    try {
      await request();
    } catch {
      throw new Error("Fullscreen is unavailable in this browser; presentation will use this window.");
    }
  }
}
