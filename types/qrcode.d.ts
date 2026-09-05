declare module 'qrcode' {
  export function toDataURL(text: string, options?: {
    width?: number
    margin?: number
    color?: { dark?: string; light?: string }
  }): Promise<string>

  export function toCanvas(canvasElement: HTMLCanvasElement, text: string, options?: {
    width?: number
    margin?: number
    color?: { dark?: string; light?: string }
  }): Promise<void>

  export function toString(text: string, options?: {
    type?: 'svg' | 'terminal'
    width?: number
    margin?: number
  }): Promise<string>
}
