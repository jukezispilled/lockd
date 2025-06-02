"use client"

import { useParams } from 'next/navigation';

export default function RootDynamicPage() {
  const { id } = useParams();

  return <div>This is the root dynamic page for id: {id}</div>;
}