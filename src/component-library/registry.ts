import { ComponentMetadata } from './types';
import { ComponentValidator } from './validator';

export class ComponentRegistry {
  private components: Map<string, ComponentMetadata> = new Map();

  register(component: ComponentMetadata): void {
    // 1. Basic schema validation
    ComponentValidator.validate(component);

    // 2. Global uniqueness validations
    ComponentValidator.validateRegistryUniqueness(
      Array.from(this.components.values()),
      component
    );

    this.components.set(component.id, component);
  }

  unregister(id: string): boolean {
    return this.components.delete(id);
  }

  getById(id: string): ComponentMetadata | undefined {
    return this.components.get(id);
  }

  list(): ComponentMetadata[] {
    return Array.from(this.components.values());
  }

  categories(): string[] {
    const cats = new Set<string>();
    for (const comp of this.components.values()) {
      if (comp.tvcs?.categoryPath && comp.tvcs.categoryPath.length > 0) {
        cats.add(comp.tvcs.categoryPath[0]); // Top level category
      } else {
        cats.add('Uncategorized');
      }
    }
    return Array.from(cats);
  }

  clear(): void {
    this.components.clear();
  }
}
