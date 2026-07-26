/**
 * Rendered by the per-island Sentry.ErrorBoundary when a render error
 * crashes the island. Before this existed a crash left silent blank space;
 * now the failure is announced and the user has a way forward.
 */
export function IslandErrorFallback() {
  return (
    <p role="alert">
      Something went wrong loading this part of AraOwl. Please reload the page to try again.
    </p>
  );
}
