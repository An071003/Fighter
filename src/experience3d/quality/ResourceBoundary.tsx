import React from 'react';
import { useAppStore } from '@/domain/store';

interface ResourceBoundaryProps {
  children: React.ReactNode;
}

interface ResourceBoundaryState {
  hasError: boolean;
}

export class ResourceBoundary extends React.Component<
  ResourceBoundaryProps,
  ResourceBoundaryState
> {
  constructor(props: ResourceBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ResourceBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    useAppStore.getState().dispatch({
      type: 'LOAD_FAILURE',
      reason: error.message || 'Không thể tải tài nguyên GLB / WebGL.',
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
