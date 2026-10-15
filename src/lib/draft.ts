import { designConfigSchema, type DesignConfig } from '../../shared/design'
export function cloneDesign(config: DesignConfig): DesignConfig {
  // Zod returns a plain clone; structuredClone cannot copy Vue's reactive Proxy.
  return designConfigSchema.parse(config)
}
