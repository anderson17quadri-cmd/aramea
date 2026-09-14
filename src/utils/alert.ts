import { Alert, Platform } from 'react-native';

/** Confirmação que também funciona na web (onde Alert.alert não mostra botões). */
export function confirm(title: string, message: string, confirmLabel = 'Confirmar', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Escolha entre várias opções (ex: câmara/galeria). Devolve o índice ou -1. */
export function choose(title: string, options: string[]): Promise<number> {
  if (Platform.OS === 'web') return Promise.resolve(options.length ? options.length - 1 : -1);
  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        ...options.map((text, i) => ({ text, onPress: () => resolve(i) })),
        { text: 'Cancelar', style: 'cancel' as const, onPress: () => resolve(-1) },
      ],
      { cancelable: true, onDismiss: () => resolve(-1) },
    );
  });
}
