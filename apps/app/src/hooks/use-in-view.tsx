import { useEffect, useState } from 'react';

export const useInView = (
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit,
) => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // console.log('IntersectionObserver entry:', entry);
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
        ...options,
      },
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref, options]);

  return isInView;
};
