import { useState, useMemo, useEffect, useCallback } from "react";
import type { DoctorProfile } from "@/types/api";
import { FilterState, defaultFilters } from "./DoctorFilters";
import { SortOption } from "./DoctorSort";
import { apiRequest } from "@/lib/api-client";

export function useDoctorDiscovery() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortOption>("relevance");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<DoctorProfile[]>("/doctors");
      setDoctors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const availableSpecializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return Array.from(specs).filter(Boolean).sort();
  }, [doctors]);

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    doctors.forEach((d) => {
      if (d.languagesSpoken) {
        d.languagesSpoken.split(",").forEach((l) => langs.add(l.trim()));
      }
    });
    return Array.from(langs).filter(Boolean).sort();
  }, [doctors]);

  const filteredAndSortedDoctors = useMemo(() => {
    let result = [...doctors];

    // Search
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(term) ||
          d.specialization.toLowerCase().includes(term) ||
          (d.consultationFocusAreas && d.consultationFocusAreas.toLowerCase().includes(term))
      );
    }

    // Filter: Specialization
    if (filters.specialization && filters.specialization !== "any") {
      result = result.filter((d) => d.specialization === filters.specialization);
    }

    // Filter: Languages
    if (filters.languages.length > 0) {
      result = result.filter((d) => {
        if (!d.languagesSpoken) return false;
        const dLangs = d.languagesSpoken.split(",").map((l) => l.trim().toLowerCase());
        return filters.languages.some((l) => dLangs.includes(l.toLowerCase()));
      });
    }

    // Filter: Experience
    if (filters.experience !== "any") {
      result = result.filter((d) => {
        if (d.yearsOfExperience == null) return false;
        if (filters.experience === "5plus") return d.yearsOfExperience >= 5;
        if (filters.experience === "10plus") return d.yearsOfExperience >= 10;
        if (filters.experience === "15plus") return d.yearsOfExperience >= 15;
        return true;
      });
    }

    // Filter: Fee Range
    if (filters.feeRange !== "any") {
      result = result.filter((d) => {
        if (d.consultationFee == null) return false;
        if (filters.feeRange === "under_1000") return d.consultationFee < 1000;
        if (filters.feeRange === "1000_3000") return d.consultationFee >= 1000 && d.consultationFee <= 3000;
        if (filters.feeRange === "above_3000") return d.consultationFee > 3000;
        return true;
      });
    }

    // Filter: Availability
    if (filters.availability !== "any") {
      const now = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      result = result.filter((d) => {
        if (!d.availabilitySlots || d.availabilitySlots.length === 0) return false;
        const availableSlots = d.availabilitySlots.filter(s => s.status === "AVAILABLE" && new Date(s.startTime) > now);
        
        if (filters.availability === "today") {
          return availableSlots.some(s => new Date(s.startTime) <= todayEnd);
        } else if (filters.availability === "week") {
          return availableSlots.some(s => new Date(s.startTime) <= nextWeek);
        }
        return false;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return (a.consultationFee || 999999) - (b.consultationFee || 999999);
        case "price_desc":
          return (b.consultationFee || 0) - (a.consultationFee || 0);
        case "exp_desc":
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        case "exp_asc":
          return (a.yearsOfExperience || 999) - (b.yearsOfExperience || 999);
        case "availability": {
          const now = new Date();
          const earliestA = a.availabilitySlots?.filter(s => s.status === "AVAILABLE" && new Date(s.startTime) > now)
                              .sort((s1, s2) => new Date(s1.startTime).getTime() - new Date(s2.startTime).getTime())[0];
          const earliestB = b.availabilitySlots?.filter(s => s.status === "AVAILABLE" && new Date(s.startTime) > now)
                              .sort((s1, s2) => new Date(s1.startTime).getTime() - new Date(s2.startTime).getTime())[0];
          
          if (earliestA && earliestB) {
            return new Date(earliestA.startTime).getTime() - new Date(earliestB.startTime).getTime();
          }
          if (earliestA) return -1;
          if (earliestB) return 1;
          return 0;
        }
        case "relevance":
        default:
          return 0; 
      }
    });

    return result;
  }, [doctors, debouncedSearch, filters, sort]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilters(defaultFilters);
    setSort("relevance");
  };

  return {
    doctors,
    filteredDoctors: filteredAndSortedDoctors,
    loading,
    error,
    fetchDoctors,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sort,
    setSort,
    availableSpecializations,
    availableLanguages,
    clearFilters,
  };
}
