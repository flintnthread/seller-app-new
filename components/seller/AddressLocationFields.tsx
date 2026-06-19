/**
 * Cascading address location fields backed by location database tables.
 * Country → State → City → Area → Pincode
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  type LayoutChangeEvent,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { fontFamilies } from "@/constants/fonts";
import {
  type AddressLocationValue,
  type LocationItem,
  type LocationSearchResult,
  fetchCountries,
  fetchStates,
  fetchCities,
  fetchAreas,
  fetchPincodes,
  searchLocations,
  saveLocation,
  resolveLocationIds,
} from "@/services/locationApi";
import { getApiErrorMessage } from "@/services/sellerProfileApi";

const T = {
  white: "#FFFFFF",
  border: "#DDE3F0",
  textDark: "#0A1533",
  textMid: "#3A4A72",
  textSoft: "#6B7A9E",
  textLight: "#9BA8C5",
  error: "#DC2626",
  orange: "#F97316",
  navyPale: "#F0F3FB",
};

const EMPTY: AddressLocationValue = {
  country: "",
  state: "",
  city: "",
  area: "",
  pincode: "",
};

type FieldKey = keyof AddressLocationValue;

export type AddressLocationErrors = Partial<Record<FieldKey, string>>;

type Props = {
  value: AddressLocationValue;
  onChange: (value: AddressLocationValue) => void;
  errors?: AddressLocationErrors;
  onClearError?: (field: FieldKey) => void;
  accentColor?: string;
  onLayout?: (field: FieldKey, e: LayoutChangeEvent) => void;
  /** Limit search suggestions to this country (e.g. "India"). Does not auto-fill country dropdown. */
  searchCountry?: string;
  /** Default country pre-filled in the add-new-location form when search finds nothing. */
  defaultCountryForAdd?: string;
};

const LocationDropdown: React.FC<{
  label: string;
  value: string;
  placeholder: string;
  options: LocationItem[];
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  accentColor: string;
  searchable?: boolean;
  filterText?: string;
  onFilterChange?: (text: string) => void;
  filterPlaceholder?: string;
  emptyMessage?: string;
  onSelect: (item: LocationItem) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  onOpenChange?: (open: boolean) => void;
}> = ({
  label, value, placeholder, options, disabled, loading, error, accentColor,
  searchable, filterText = "", onFilterChange, filterPlaceholder, emptyMessage,
  onSelect, onLayout, onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const canOpen = !disabled && !loading;

  const setDropdownOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <View style={[dd.wrap, open && dd.wrapOpen]} onLayout={onLayout}>
      <Text style={dd.label}>
        {label} <Text style={[dd.asterisk, { color: accentColor }]}>*</Text>
      </Text>
      <View style={dd.triggerWrap}>
        <TouchableOpacity
          onPress={() => canOpen && setDropdownOpen(!open)}
          activeOpacity={0.85}
          style={[
            dd.trigger,
            { borderColor: error ? T.error : open ? accentColor : T.border },
            disabled && dd.triggerDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 8 }} />
          ) : null}
          <Text style={[dd.triggerText, !value && { color: T.textLight }]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <Icon name="chevron-down" size={12} color={T.textSoft} />
        </TouchableOpacity>
        {open ? (
          <View style={dd.menu}>
            {searchable ? (
              <View style={dd.filterRow}>
                <Icon name="search" size={12} color={T.textSoft} />
                <TextInput
                  style={dd.filterInput}
                  value={filterText}
                  onChangeText={onFilterChange}
                  placeholder={filterPlaceholder ?? "Type to search…"}
                  placeholderTextColor={T.textLight}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>
            ) : null}
            <ScrollView
              style={dd.menuScroll}
              contentContainerStyle={dd.menuScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}
            >
              {options.length === 0 ? (
                <Text style={dd.emptyText}>
                  {loading ? "Loading…" : (emptyMessage ?? "No results found")}
                </Text>
              ) : (
                options.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => { onSelect(opt); setDropdownOpen(false); }}
                    style={[dd.option, value === opt.name && dd.optionActive]}
                  >
                    <Text style={[dd.optionText, value === opt.name && dd.optionTextActive]} numberOfLines={1}>
                      {opt.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
      {error ? (
        <View style={dd.errorRow}>
          <Icon name="exclamation-circle" size={11} color={T.error} />
          <Text style={dd.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

export function AddressLocationFields({
  value,
  onChange,
  errors = {},
  onClearError,
  accentColor = T.orange,
  onLayout,
  searchCountry,
  defaultCountryForAdd = "",
}: Props) {
  const isWeb = Platform.OS === "web";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDisplay, setSearchDisplay] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<AddressLocationValue>(EMPTY);
  const [addError, setAddError] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSearchRef = useRef(false);

  const [countryFilter, setCountryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");

  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [areaId, setAreaId] = useState<number | undefined>();

  const [countries, setCountries] = useState<LocationItem[]>([]);
  const [states, setStates] = useState<LocationItem[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [areas, setAreas] = useState<LocationItem[]>([]);
  const [pincodes, setPincodes] = useState<LocationItem[]>([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const [hydrating, setHydrating] = useState(false);

  // Bump when user picks a parent dropdown so child lists refetch even if the ID is unchanged.
  const [countryPickSeq, setCountryPickSeq] = useState(0);
  const [statePickSeq, setStatePickSeq] = useState(0);
  const [cityPickSeq, setCityPickSeq] = useState(0);
  const [areaPickSeq, setAreaPickSeq] = useState(0);
  const rowOpenCount = useRef([0, 0, 0]);
  const [elevatedRows, setElevatedRows] = useState<Set<number>>(() => new Set());

  const handleRowOpenChange = useCallback((row: number, open: boolean) => {
    rowOpenCount.current[row] = Math.max(0, rowOpenCount.current[row] + (open ? 1 : -1));
    const next = new Set<number>();
    rowOpenCount.current.forEach((count, index) => {
      if (count > 0) next.add(index);
    });
    setElevatedRows(next);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingCountries(true);
    const timer = setTimeout(() => {
      fetchCountries(countryFilter.trim() || undefined)
        .then((data) => { if (active) setCountries(data); })
        .catch(() => { if (active) setCountries([]); })
        .finally(() => { if (active) setLoadingCountries(false); });
    }, countryFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [countryFilter]);

  // Keep countryId in sync with the selected country name (and clear children when country is cleared).
  useEffect(() => {
    if (!value.country.trim()) {
      setCountryId(undefined);
      setStateId(undefined);
      setCityId(undefined);
      setAreaId(undefined);
      setStates([]);
      setCities([]);
      setAreas([]);
      setPincodes([]);
      return;
    }
    if (!countries.length) return;
    const match = countries.find(
      (c) => c.name.toLowerCase() === value.country.trim().toLowerCase()
    );
    setCountryId(match?.id);
    if (!match) {
      setStateId(undefined);
      setCityId(undefined);
      setAreaId(undefined);
      setStates([]);
      setCities([]);
      setAreas([]);
      setPincodes([]);
    }
  }, [countries, value.country]);

  useEffect(() => {
    if (!value.state.trim()) {
      setStateId(undefined);
      setCityId(undefined);
      setAreaId(undefined);
      setCities([]);
      setAreas([]);
      setPincodes([]);
      return;
    }
    if (!states.length) return;
    const match = states.find(
      (s) => s.name.toLowerCase() === value.state.trim().toLowerCase()
    );
    if (match) setStateId(match.id);
  }, [value.state, states]);

  useEffect(() => {
    if (!value.city.trim()) {
      setCityId(undefined);
      setAreaId(undefined);
      setAreas([]);
      setPincodes([]);
      return;
    }
    if (!cities.length) return;
    const match = cities.find(
      (c) => c.name.toLowerCase() === value.city.trim().toLowerCase()
    );
    if (match) setCityId(match.id);
  }, [value.city, cities]);

  useEffect(() => {
    if (!value.area.trim()) {
      setAreaId(undefined);
      setPincodes([]);
      return;
    }
    if (!areas.length) return;
    const match = areas.find(
      (a) => a.name.toLowerCase() === value.area.trim().toLowerCase()
    );
    if (match) setAreaId(match.id);
  }, [value.area, areas]);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    let active = true;
    setLoadingStates(true);
    const timer = setTimeout(() => {
      fetchStates(countryId, stateFilter.trim() || undefined)
        .then((data) => { if (active) setStates(data); })
        .catch(() => { if (active) setStates([]); })
        .finally(() => { if (active) setLoadingStates(false); });
    }, stateFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [countryId, stateFilter, countryPickSeq]);

  useEffect(() => {
    setStateFilter("");
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }
    let active = true;
    setLoadingCities(true);
    const timer = setTimeout(() => {
      fetchCities(stateId, cityFilter.trim() || undefined)
        .then((data) => { if (active) setCities(data); })
        .catch(() => { if (active) setCities([]); })
        .finally(() => { if (active) setLoadingCities(false); });
    }, cityFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [stateId, cityFilter, statePickSeq]);

  useEffect(() => {
    setCityFilter("");
  }, [stateId]);

  useEffect(() => {
    if (!cityId) {
      setAreas([]);
      return;
    }
    let active = true;
    setLoadingAreas(true);
    const timer = setTimeout(() => {
      fetchAreas(cityId, areaFilter.trim() || undefined)
        .then((data) => { if (active) setAreas(data); })
        .catch(() => { if (active) setAreas([]); })
        .finally(() => { if (active) setLoadingAreas(false); });
    }, areaFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [cityId, areaFilter, cityPickSeq]);

  useEffect(() => {
    setAreaFilter("");
  }, [cityId]);

  useEffect(() => {
    if (!areaId) {
      setPincodes([]);
      return;
    }
    let active = true;
    setLoadingPincodes(true);
    const timer = setTimeout(() => {
      fetchPincodes(areaId, pincodeFilter.trim() || undefined)
        .then((data) => { if (active) setPincodes(data); })
        .catch(() => { if (active) setPincodes([]); })
        .finally(() => { if (active) setLoadingPincodes(false); });
    }, pincodeFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [areaId, pincodeFilter, areaPickSeq]);

  useEffect(() => {
    setPincodeFilter("");
  }, [areaId]);

  const hydratedRef = useRef("");
  useEffect(() => {
    const key = [value.country, value.state, value.city, value.area, value.pincode].join("|");
    const hasValue = key.replace(/\|/g, "").trim().length > 0;
    if (!hasValue || hydratedRef.current === key) return;

    // Resolve dropdown IDs only when the user has a full saved location, not partial fields.
    const isComplete = Boolean(
      value.country.trim() && value.state.trim() && value.city.trim()
      && value.area.trim() && value.pincode.trim()
    );
    if (!isComplete) return;

    let active = true;
    setHydrating(true);
    resolveLocationIds(value)
      .then((ids) => {
        if (!active) return;
        setCountryId(ids.countryId);
        setStateId(ids.stateId);
        setCityId(ids.cityId);
        setAreaId(ids.areaId);
        hydratedRef.current = key;
      })
      .finally(() => { if (active) setHydrating(false); });

    return () => { active = false; };
  }, [value.country, value.state, value.city, value.area, value.pincode]);

  const formatLocationLabel = (loc: AddressLocationValue) =>
    [loc.area, loc.city, loc.state, loc.pincode, loc.country].filter(Boolean).join(", ");

  const formatSuggestionTitle = (item: LocationSearchResult, query: string) => {
    if (item.displayName) {
      const parts = item.displayName.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(0, 2).join(", ");
      }
      return item.displayName;
    }
    const q = query.trim().toLowerCase();
    const isPincodeSearch = /^\d+$/.test(q);
    if (isPincodeSearch && item.pincode) {
      return `${item.pincode} — ${item.area}`;
    }
    if (item.area && item.area.toLowerCase() !== item.city?.toLowerCase()) {
      return `${item.area}, ${item.city}`;
    }
    return item.city || item.area;
  };

  const formatSuggestionSubtitle = (item: LocationSearchResult) => {
    if (item.displayName) {
      return item.displayName;
    }
    const parts = [item.city, item.state];
    if (item.pincode) parts.push(item.pincode);
    parts.push(item.country);
    return parts.filter(Boolean).join(", ");
  };

  const getSearchMinLength = (q: string) => {
    if (/^\d+$/.test(q)) return q.length >= 6 ? 6 : 3;
    return 2;
  };

  const shouldShowNoResults = (q: string) => {
    const t = q.trim();
    if (!t) return false;
    // Avoid "No results" while user is still typing (Google Maps style).
    if (/^\d+$/.test(t)) return t.length >= 6;
    return t.length >= 5;
  };

  const buildAddDraftFromQuery = useCallback((q: string): AddressLocationValue => {
    const trimmed = q.trim();
    const isPincode = /^\d{6}$/.test(trimmed);
    const isWord = /^[a-zA-Z][a-zA-Z\s.-]*$/.test(trimmed);
    return {
      country: defaultCountryForAdd || "",
      state: "",
      city: isWord && !isPincode ? trimmed : "",
      area: "",
      pincode: isPincode ? trimmed : "",
    };
  }, [defaultCountryForAdd]);

  const applySearchResult = useCallback(async (item: LocationSearchResult) => {
    let resolved = item;

    if (item.external) {
      const hasPincode = /^\d{6}$/.test(item.pincode || "");
      if (hasPincode && item.country && item.state && item.city && item.area) {
        try {
          const saved = await saveLocation({
            country: item.country,
            state: item.state,
            city: item.city,
            area: item.area,
            pincode: item.pincode,
          });
          resolved = { ...saved, external: false };
        } catch {
          resolved = item;
        }
      }
    }

    skipSearchRef.current = true;
    setCountryId(resolved.countryId > 0 ? resolved.countryId : undefined);
    setStateId(resolved.stateId > 0 ? resolved.stateId : undefined);
    setCityId(resolved.cityId > 0 ? resolved.cityId : undefined);
    setAreaId(resolved.areaId > 0 ? resolved.areaId : undefined);
    hydratedRef.current = [resolved.country, resolved.state, resolved.city, resolved.area, resolved.pincode].join("|");

    onChange({
      country: resolved.country,
      state: resolved.state,
      city: resolved.city,
      area: resolved.area,
      pincode: resolved.pincode || "",
    });
    (["country", "state", "city", "area", "pincode"] as FieldKey[]).forEach((f) => onClearError?.(f));

    const label = resolved.displayName
      || (resolved.pincode
        ? `${resolved.pincode} — ${resolved.area}, ${resolved.city}, ${resolved.state}, ${resolved.country}`
        : `${resolved.area}, ${resolved.city}, ${resolved.state}, ${resolved.country}`);
    setSearchDisplay(label);
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchError("");
    setShowAddForm(false);
    setAddError("");

    try {
      const ids = resolved.countryId > 0
        ? {
            countryId: resolved.countryId,
            stateId: resolved.stateId > 0 ? resolved.stateId : undefined,
            cityId: resolved.cityId > 0 ? resolved.cityId : undefined,
            areaId: resolved.areaId > 0 ? resolved.areaId : undefined,
          }
        : await resolveLocationIds({
            country: resolved.country,
            state: resolved.state,
            city: resolved.city,
            area: resolved.area,
            pincode: resolved.pincode || "",
          });

      if (ids.countryId) setCountryId(ids.countryId);
      if (ids.stateId) setStateId(ids.stateId);
      if (ids.cityId) setCityId(ids.cityId);
      if (ids.areaId) setAreaId(ids.areaId);

      const [statesData, citiesData, areasData, pincodesData] = await Promise.all([
        ids.countryId ? fetchStates(ids.countryId) : Promise.resolve([]),
        ids.stateId ? fetchCities(ids.stateId) : Promise.resolve([]),
        ids.cityId ? fetchAreas(ids.cityId) : Promise.resolve([]),
        ids.areaId ? fetchPincodes(ids.areaId) : Promise.resolve([]),
      ]);
      setStates(statesData);
      setCities(citiesData);
      setAreas(areasData);
      setPincodes(pincodesData);
    } catch {
      // Cascading effects will still load lists from IDs.
    }
  }, [onChange, onClearError]);

  const handleSaveNewLocation = useCallback(async () => {
    setAddError("");
    const payload = {
      country: addDraft.country.trim(),
      state: addDraft.state.trim(),
      city: addDraft.city.trim(),
      area: addDraft.area.trim(),
      pincode: addDraft.pincode.trim(),
    };

    if (!payload.country || !payload.state || !payload.city || !payload.area || !/^\d{6}$/.test(payload.pincode)) {
      setAddError("Fill Country, State, City, Area and a valid 6-digit Pincode.");
      return;
    }

    setSavingLocation(true);
    try {
      const saved = await saveLocation(payload);
      setShowAddForm(false);
      setSearchError("");
      await applySearchResult(saved);
    } catch (e) {
      setAddError(getApiErrorMessage(e, "Could not save location to database."));
    } finally {
      setSavingLocation(false);
    }
  }, [addDraft, applySearchResult]);

  useEffect(() => {
    const label = formatLocationLabel(value);
    // Only mirror a completed selection into the search bar, not partial profile leftovers.
    if (label && !searchQuery && value.country && value.state && value.city && value.area && value.pincode) {
      setSearchDisplay(label);
    }
  }, [value.country, value.state, value.city, value.area, value.pincode, searchQuery]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const q = searchQuery.trim();
    const minLen = getSearchMinLength(q);
    if (q.length < minLen) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      setShowAddForm(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    searchTimer.current = setTimeout(() => {
      searchLocations(q, searchCountry?.trim() || undefined)
        .then((results) => {
          setSearchResults(results);
          if (results.length === 0) {
            // Don't show "no results" too early — wait until query is more complete.
            if (shouldShowNoResults(q)) {
              setSearchError(`No locations found${searchCountry ? ` in ${searchCountry}` : ""}.`);
            } else {
              setSearchError("");
            }
            setAddDraft(buildAddDraftFromQuery(q));
            setShowAddForm(false);
            return;
          }
          setSearchError("");
          setShowAddForm(false);
          setAddError("");

          // Auto-fill only for an exact 6-digit pincode the user typed.
          if (/^\d{6}$/.test(q)) {
            const exact = results.find((r) => r.pincode === q);
            if (exact) {
              void applySearchResult(exact);
            }
          }
        })
        .catch(() => {
          setSearchResults([]);
          setSearchError("Could not search locations. Please try again.");
        })
        .finally(() => setSearchLoading(false));
    }, 250);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, searchCountry, applySearchResult, buildAddDraftFromQuery]);

  const selectCountry = (item: LocationItem) => {
    setCountryId(item.id);
    setStateId(undefined);
    setCityId(undefined);
    setAreaId(undefined);
    setCities([]);
    setAreas([]);
    setPincodes([]);
    setStateFilter("");
    setCityFilter("");
    setAreaFilter("");
    setPincodeFilter("");
    setCountryFilter("");
    setCountryPickSeq((n) => n + 1);
    onChange({ ...EMPTY, country: item.name });
    onClearError?.("country");
  };

  const selectState = (item: LocationItem) => {
    setStateId(item.id);
    setCityId(undefined);
    setAreaId(undefined);
    setAreas([]);
    setPincodes([]);
    setCityFilter("");
    setAreaFilter("");
    setPincodeFilter("");
    setStatePickSeq((n) => n + 1);
    onChange({ ...value, state: item.name, city: "", area: "", pincode: "" });
    onClearError?.("state");
  };

  const selectCity = (item: LocationItem) => {
    setCityId(item.id);
    setAreaId(undefined);
    setPincodes([]);
    setAreaFilter("");
    setPincodeFilter("");
    setCityPickSeq((n) => n + 1);
    onChange({ ...value, city: item.name, area: "", pincode: "" });
    onClearError?.("city");
  };

  const selectArea = (item: LocationItem) => {
    setAreaId(item.id);
    setPincodes([]);
    setPincodeFilter("");
    setAreaPickSeq((n) => n + 1);
    onChange({ ...value, area: item.name, pincode: "" });
    onClearError?.("area");
  };

  const selectPincode = (item: LocationItem) => {
    onChange({ ...value, pincode: item.name });
    onClearError?.("pincode");
  };

  return (
    <View style={s.wrap}>
      <View style={s.searchWrap}>
        <Text style={s.label}>Search location (Maps-style auto-fill)</Text>
        <View style={[s.searchField, { borderColor: showSearchResults ? accentColor : T.border }]}>
          <Icon name="search" size={14} color={accentColor} />
          <TextInput
            style={s.searchInput}
            value={searchQuery || searchDisplay}
            onChangeText={(t) => {
              setSearchQuery(t);
              setSearchDisplay("");
              setShowSearchResults(true);
              setShowAddForm(false);
              setAddError("");
            }}
            onFocus={() => {
              setShowSearchResults(true);
              if (!searchQuery && searchDisplay) {
                setSearchQuery(searchDisplay);
                setSearchDisplay("");
              }
            }}
            onSubmitEditing={() => {
              if (searchResults.length > 0) {
                void applySearchResult(searchResults[0]);
              }
            }}
            placeholder={searchCountry
              ? `Type area, city, state or pincode in ${searchCountry}…`
              : "Type area, city, state or pincode…"}
            placeholderTextColor={T.textLight}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchLoading ? <ActivityIndicator size="small" color={accentColor} /> : null}
          {(searchQuery || searchDisplay) ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchDisplay("");
                setSearchResults([]);
                setSearchError("");
                setShowSearchResults(false);
                setShowAddForm(false);
                setAddError("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="times-circle" size={16} color={T.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={s.searchHint}>
          Type one word — suggestions appear automatically (like Google Maps). Tap a result to auto-fill all fields.
        </Text>
        {showSearchResults && searchQuery.trim().length > 0 && searchLoading && (
          <Text style={s.searchStatus}>Finding locations…</Text>
        )}
        {showSearchResults && searchError && !searchLoading && shouldShowNoResults(searchQuery) ? (
          <Text style={s.searchError}>{searchError}</Text>
        ) : null}
        {showSearchResults && searchResults.length > 0 && (
          <View style={s.searchMenu}>
            <Text style={s.searchCount}>
              {searchResults.length} suggestion{searchResults.length === 1 ? "" : "s"} — tap to auto-fill
            </Text>
            <ScrollView
              style={s.searchMenuScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.external ? `ext-${item.externalId || item.displayName}` : `${item.areaId}-${item.pincodeId || item.cityId}`}
                  style={s.searchOption}
                  onPress={() => { void applySearchResult(item); }}
                >
                  <View style={s.searchOptionRow}>
                    <Text style={s.searchOptionTitle}>
                      {formatSuggestionTitle(item, searchQuery)}
                    </Text>
                    {item.external ? (
                      <View style={[s.mapsBadge, { borderColor: accentColor }]}>
                        <Text style={[s.mapsBadgeText, { color: accentColor }]}>Maps</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.searchOptionSub} numberOfLines={2}>
                    {formatSuggestionSubtitle(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showSearchResults && !searchLoading && shouldShowNoResults(searchQuery) && searchQuery.trim().length >= getSearchMinLength(searchQuery.trim()) && searchResults.length === 0 && !showAddForm ? (
          <TouchableOpacity
            style={s.addManualBtn}
            onPress={() => {
              setAddDraft(buildAddDraftFromQuery(searchQuery.trim()));
              setShowAddForm(true);
            }}
          >
            <Icon name="plus-circle" size={14} color={accentColor} />
            <Text style={[s.addManualText, { color: accentColor }]}>Add location manually</Text>
          </TouchableOpacity>
        ) : null}

        {showSearchResults && showAddForm && !searchLoading && searchQuery.trim().length >= getSearchMinLength(searchQuery.trim()) && (
          <View style={s.addCard}>
            <Text style={s.addTitle}>Add new location to database</Text>
            <Text style={s.addSub}>
              This address was not found. Enter details below — they will be saved and used to fill the form.
            </Text>
            {(["country", "state", "city", "area"] as const).map((field) => (
              <View key={field} style={s.addFieldWrap}>
                <Text style={s.addLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
                <TextInput
                  style={s.addInput}
                  value={addDraft[field]}
                  onChangeText={(t) => setAddDraft((prev) => ({ ...prev, [field]: t }))}
                  placeholder={`Enter ${field}`}
                  placeholderTextColor={T.textLight}
                  autoCorrect={false}
                />
              </View>
            ))}
            <View style={s.addFieldWrap}>
              <Text style={s.addLabel}>Pincode</Text>
              <TextInput
                style={s.addInput}
                value={addDraft.pincode}
                onChangeText={(t) => setAddDraft((prev) => ({ ...prev, pincode: t.replace(/\D/g, "").slice(0, 6) }))}
                placeholder="6-digit pincode"
                placeholderTextColor={T.textLight}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            {addError ? <Text style={s.searchError}>{addError}</Text> : null}
            <TouchableOpacity
              onPress={() => { void handleSaveNewLocation(); }}
              style={[s.addBtn, { backgroundColor: accentColor }]}
              activeOpacity={0.88}
              disabled={savingLocation}
            >
              {savingLocation ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <Text style={s.addBtnText}>Save & auto-fill address</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {hydrating ? (
        <View style={s.hydrateRow}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={s.hydrateText}>Loading saved location…</Text>
        </View>
      ) : null}

      <View style={[isWeb ? s.row : undefined, isWeb && elevatedRows.has(0) && s.rowElevated]}>
        <View style={isWeb ? s.half : undefined}>
          <LocationDropdown
            label="Country"
            value={value.country}
            placeholder="Select Country"
            options={countries}
            loading={loadingCountries}
            error={errors.country}
            accentColor={accentColor}
            searchable
            filterText={countryFilter}
            onFilterChange={setCountryFilter}
            filterPlaceholder="Search country…"
            emptyMessage="Type a country name to search."
            onSelect={selectCountry}
            onOpenChange={(open) => handleRowOpenChange(0, open)}
            onLayout={onLayout ? (e) => onLayout("country", e) : undefined}
          />
        </View>
        <View style={isWeb ? s.half : undefined}>
          <LocationDropdown
            label="State"
            value={value.state}
            placeholder="Select State"
            options={states}
            disabled={!countryId}
            loading={loadingStates}
            error={errors.state}
            accentColor={accentColor}
            searchable
            filterText={stateFilter}
            onFilterChange={setStateFilter}
            filterPlaceholder="Search state…"
            emptyMessage="No states found. Try another search."
            onSelect={selectState}
            onOpenChange={(open) => handleRowOpenChange(0, open)}
            onLayout={onLayout ? (e) => onLayout("state", e) : undefined}
          />
        </View>
      </View>

      <View style={[isWeb ? s.row : undefined, isWeb && elevatedRows.has(1) && s.rowElevated]}>
        <View style={isWeb ? s.half : undefined}>
          <LocationDropdown
            label="City"
            value={value.city}
            placeholder="Select City"
            options={cities}
            disabled={!stateId}
            loading={loadingCities}
            error={errors.city}
            accentColor={accentColor}
            searchable
            filterText={cityFilter}
            onFilterChange={setCityFilter}
            filterPlaceholder="Search city in selected state…"
            emptyMessage={stateId ? "Type a city name to search." : "Select a state first."}
            onSelect={selectCity}
            onOpenChange={(open) => handleRowOpenChange(1, open)}
            onLayout={onLayout ? (e) => onLayout("city", e) : undefined}
          />
        </View>
        <View style={isWeb ? s.half : undefined}>
          <LocationDropdown
            label="Area"
            value={value.area}
            placeholder="Select Area"
            options={areas}
            disabled={!cityId}
            loading={loadingAreas}
            error={errors.area}
            accentColor={accentColor}
            searchable
            filterText={areaFilter}
            onFilterChange={setAreaFilter}
            filterPlaceholder="Search area in selected city…"
            emptyMessage={cityId ? "Type an area name to search." : "Select a city first."}
            onSelect={selectArea}
            onOpenChange={(open) => handleRowOpenChange(1, open)}
            onLayout={onLayout ? (e) => onLayout("area", e) : undefined}
          />
        </View>
      </View>

      <View style={[isWeb ? s.row : undefined, isWeb && elevatedRows.has(2) && s.rowElevated]}>
        <View style={isWeb ? s.half : undefined}>
          <LocationDropdown
            label="Pincode"
            value={value.pincode}
            placeholder="Select Pincode"
            options={pincodes}
            disabled={!areaId}
            loading={loadingPincodes}
            error={errors.pincode}
            accentColor={accentColor}
            searchable
            filterText={pincodeFilter}
            onFilterChange={setPincodeFilter}
            filterPlaceholder="Search pincode in selected area…"
            emptyMessage={areaId ? "Type a pincode to search." : "Select an area first."}
            onSelect={selectPincode}
            onOpenChange={(open) => handleRowOpenChange(2, open)}
            onLayout={onLayout ? (e) => onLayout("pincode", e) : undefined}
          />
        </View>
      </View>
    </View>
  );
}

export { EMPTY as EMPTY_ADDRESS_LOCATION };

const s = StyleSheet.create({
  wrap: { gap: 0, overflow: "visible" as const },
  row: {
    flexDirection: "row",
    gap: 10,
    overflow: "visible" as const,
    ...(Platform.OS === "web" ? ({ position: "relative", zIndex: 1 } as object) : {}),
  },
  half: {
    flex: 1,
    overflow: "visible" as const,
    ...(Platform.OS === "web" ? ({ position: "relative" } as object) : {}),
  },
  rowElevated: {
    zIndex: 3000,
    elevation: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: T.textMid,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  searchWrap: { marginBottom: 14 },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  searchInput: { flex: 1, fontSize: 13, color: T.textDark, fontFamily: fontFamilies.regular },
  searchHint: { fontSize: 11, color: T.textLight, marginTop: 6, fontStyle: "italic" },
  searchStatus: { fontSize: 12, color: T.textSoft, marginTop: 8 },
  searchError: { fontSize: 12, color: T.error, marginTop: 8 },
  addCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.white,
    gap: 8,
  },
  addTitle: { fontSize: 14, fontFamily: fontFamilies.bold, color: T.textDark },
  addSub: { fontSize: 12, color: T.textSoft, lineHeight: 17, marginBottom: 4 },
  addFieldWrap: { gap: 6 },
  addLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: T.textMid,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  addInput: {
    backgroundColor: T.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: T.textDark,
    fontFamily: fontFamilies.regular,
  },
  addBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 14, fontFamily: fontFamilies.bold, color: T.white },
  searchMenu: {
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    marginTop: 6,
    overflow: "hidden",
    maxHeight: 260,
    zIndex: 100,
  },
  searchCount: {
    fontSize: 11,
    color: T.textSoft,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    fontFamily: fontFamilies.medium,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.navyPale,
  },
  searchMenuScroll: { maxHeight: 220 },
  searchOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  searchOptionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mapsBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mapsBadgeText: { fontSize: 9, fontFamily: fontFamilies.bold, textTransform: "uppercase" },
  addManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
  },
  addManualText: { fontSize: 13, fontFamily: fontFamilies.semiBold },
  searchOptionTitle: { fontSize: 13, color: T.textDark, fontFamily: fontFamilies.semiBold },
  searchOptionSub: { fontSize: 11, color: T.textSoft, marginTop: 2 },
  hydrateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  hydrateText: { fontSize: 12, color: T.textSoft },
});

const dd = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    position: "relative",
    overflow: "visible",
  },
  wrapOpen: {
    zIndex: 2000,
    elevation: 12,
    ...(Platform.OS === "web" ? ({ isolation: "isolate" } as object) : {}),
  },
  label: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: T.textMid,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  asterisk: { fontSize: 11, fontFamily: fontFamilies.bold },
  triggerWrap: {
    position: "relative",
    zIndex: 1,
    overflow: "visible",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  triggerDisabled: { opacity: 0.55, backgroundColor: T.navyPale },
  triggerText: { flex: 1, fontSize: 13, color: T.textDark, fontFamily: fontFamilies.regular },
  menu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    marginTop: 4,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 2001,
    elevation: 12,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 8px 24px rgba(15, 31, 75, 0.16)",
        } as object)
      : {}),
  },
  menuScroll: { maxHeight: 220 },
  menuScrollContent: { flexGrow: 0 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.navyPale,
  },
  filterInput: { flex: 1, fontSize: 13, color: T.textDark, fontFamily: fontFamilies.regular, padding: 0 },
  emptyText: { padding: 14, fontSize: 12, color: T.textSoft, textAlign: "center" },
  option: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  optionActive: { backgroundColor: "#FFF4EC" },
  optionText: { fontSize: 13, color: T.textMid, fontFamily: fontFamilies.medium },
  optionTextActive: { color: T.textDark, fontFamily: fontFamilies.bold },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, marginLeft: 2 },
  errorText: { fontSize: 11, color: T.error, flex: 1 },
});
