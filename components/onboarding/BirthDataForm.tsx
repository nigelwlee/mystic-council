"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBirthData } from "@/lib/context/birth-data-context";
import type { BirthData } from "@/lib/experts/types";

export function BirthDataForm() {
  const router = useRouter();
  const { setBirthData } = useBirthData();
  const [form, setForm] = useState<BirthData>({
    name: "",
    date: "",
    time: "",
    location: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: BirthData = {};
    if (form.name?.trim()) data.name = form.name.trim();
    if (form.date) data.date = form.date;
    if (form.time) data.time = form.time;
    if (form.location?.trim()) data.location = form.location.trim();
    setBirthData(data);
    router.push("/chat");
  };

  const handleSkip = () => {
    router.push("/chat");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
      <div className="space-y-1">
        <label className="text-xs text-neutral-500 uppercase tracking-widest">Name</label>
        <Input
          placeholder="Your full name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus-visible:ring-neutral-700 text-base"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500 uppercase tracking-widest">Date of Birth</label>
        <Input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="bg-neutral-900 border-neutral-800 text-neutral-100 focus-visible:ring-neutral-700 text-base [color-scheme:dark]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500 uppercase tracking-widest">
          Time of Birth <span className="normal-case text-neutral-600">(optional)</span>
        </label>
        <Input
          type="time"
          value={form.time}
          onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
          className="bg-neutral-900 border-neutral-800 text-neutral-100 focus-visible:ring-neutral-700 text-base [color-scheme:dark]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500 uppercase tracking-widest">
          Location <span className="normal-case text-neutral-600">(optional)</span>
        </label>
        <Input
          placeholder="City of birth"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus-visible:ring-neutral-700 text-base"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          className="w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
        >
          Enter the Council
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="w-full text-neutral-600 hover:text-neutral-400 hover:bg-transparent"
        >
          Skip
        </Button>
      </div>
    </form>
  );
}
