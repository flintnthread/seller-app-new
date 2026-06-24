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
  resolvePlace,
  resolveLocationIds,
  addPincode,
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
  error?: string | undefined;
  accentColor: string;
  searchable?: boolean;
  filterText?: string;
  onFilterChange?: (text: string) => void;
  filterPlaceholder?: string;
  emptyMessage?: string;
  onSelect: (item: LocationItem) => void;
  onLayout?: ((e: LayoutChangeEvent) => void) | undefined;
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
  const pendingPincodeRef = useRef("");
  const [showManualPincode, setShowManualPincode] = useState(false);
  const [manualPincode, setManualPincode] = useState("");
  const [addingPincode, setAddingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");

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
    rowOpenCount.current[row] = Math.max(0, (rowOpenCount.current[row] ?? 0) + (open ? 1 : -1));
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
      setShowManualPincode(false);
      return;
    }
    let active = true;
    setLoadingPincodes(true);
    const timer = setTimeout(() => {
      fetchPincodes(areaId, pincodeFilter.trim() || undefined)
        .then((data) => {
          if (!active) return;
          const pending = pendingPincodeRef.current;
          if (pending && data.every((p) => p.name !== pending)) {
            setPincodes([{ id: -1, name: pending }, ...data]);
          } else {
            setPincodes(data);
          }

          // Show manual pincode input when area has no pincodes and none is selected yet
          if (data.length === 0 && !value.pincode.trim()) {
            setShowManualPincode(true);
          } else if (data.length > 0 && value.pincode.trim()) {
            setShowManualPincode(false);
          }
        })
        .catch(() => {
          if (active) {
            setPincodes([]);
            if (!value.pincode.trim()) setShowManualPincode(true);
          }
        })
        .finally(() => { if (active) setLoadingPincodes(false); });
    }, pincodeFilter.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [areaId, pincodeFilter, areaPickSeq, value.pincode]);

  useEffect(() => {
    setPincodeFilter("");
  }, [areaId]);

  // Auto-fill pincode when an area is selected but pincode is still empty.
  useEffect(() => {
    if (!areaId || value.pincode.trim() || loadingPincodes || pincodes.length === 0) return;
    const pin = pincodes.at(0)?.name;
    if (pin) {
      onChange({ ...value, pincode: pin });
      onClearError?.("pincode");
      setShowManualPincode(false);
    }
  }, [areaId, pincodes, value, loadingPincodes, onChange, onClearError]);

  const hydratedRef = useRef("");
  useEffect(() => {
    const key = [value.country, value.state, value.city, value.area, value.pincode].join("|");
    const hasValue = key.replace(/\|/g, "").trim().length > 0;
    if (!hasValue || hydratedRef.current === key) return;

    // Resolve dropdown IDs when location names are saved; backfill pincode from DB if missing.
    const hasLocation = Boolean(
      value.country.trim() && value.state.trim() && value.city.trim() && value.area.trim()
    );
    if (!hasLocation || hydratedRef.current === key) return;

    let active = true;
    setHydrating(true);
    resolveLocationIds(value)
      .then((ids) => {
        if (!active) return;
        setCountryId(ids.countryId);
        setStateId(ids.stateId);
        setCityId(ids.cityId);
        setAreaId(ids.areaId);
        if (ids.pincode && !value.pincode.trim()) {
          onChange({ ...value, pincode: ids.pincode });
        }
        if (ids.areaId && !value.pincode.trim() && !ids.pincode) {
          setShowManualPincode(true);
        }
        hydratedRef.current = ids.pincode && !value.pincode.trim()
          ? [value.country, value.state, value.city, value.area, ids.pincode].join("|")
          : key;
      })
      .finally(() => { if (active) setHydrating(false); });

    return () => { active = false; };
  }, [value, onChange]);

  const formatLocationLabel = (loc: AddressLocationValue) =>
    [loc.area, loc.city, loc.state, loc.pincode, loc.country].filter(Boolean).join(", ");

  const formatSuggestionTitle = (item: LocationSearchResult) => {
    return item.area || item.displayName?.split(",").map((p) => p.trim()).filter(Boolean)[0] || item.city || "";
  };

  /** Subtitle: mandal, district, state, pincode — e.g. Gurazala, Palnadu, Andhra Pradesh, 522415 */
  const formatSuggestionSubtitle = (item: LocationSearchResult) => {
    if (item.displayName) {
      const parts = item.displayName.split(",").map((p) => p.trim()).filter(Boolean);
      const tail = parts.slice(1).filter((p) => p.toLowerCase() !== "india");
      if (tail.length > 0) {
        return tail.join(", ");
      }
    }
    const parts: string[] = [];
    const mandal = item.mandal?.trim() || "";
    if (mandal) {
      parts.push(mandal);
    }
    const district = item.district?.trim() || (item.city?.trim() && item.city !== mandal ? item.city.trim() : "");
    if (district && !parts.some((p) => p.toLowerCase() === district.toLowerCase())) {
      parts.push(district);
    }
    if (item.state?.trim()) {
      parts.push(item.state.trim());
    }
    if (item.pincode?.trim() && /^\d{6}$/.test(item.pincode.trim())) {
      parts.push(item.pincode.trim());
    }
    return parts.join(", ");
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

  const resolvePincodeForArea = useCallback(async (areaId: number, preferred?: string): Promise<string> => {
    if (preferred && /^\d{6}$/.test(preferred)) return preferred;
    try {
      const list = await fetchPincodes(areaId);
      if (preferred) {
        const match = list.find((p) => p.name === preferred);
        if (match) return match.name;
      }
      return list.at(0)?.name ?? preferred ?? "";
    } catch {
      return preferred ?? "";
    }
  }, []);

  const buildAddDraftFromQuery = useCallback((q: string): AddressLocationValue => {
    const trimmed = q.trim();
    const isPincode = /^\d{6}$/.test(trimmed);
    const isWord = /^[a-zA-Z][a-zA-Z\s.-]*$/.test(trimmed);
    return {
      country: defaultCountryForAdd || "",
      state: "",
      city: "",
      area: "",
      pincode: isPincode ? trimmed : "",
    };
  }, [defaultCountryForAdd]);

  const isValidPincode = (code: string) => /^\d{6}$/.test(code);

  const applySearchResult = useCallback(async (item: LocationSearchResult) => {
    skipSearchRef.current = true;
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchError("");
    setShowAddForm(false);
    setAddError("");

    setSearchDisplay(item.displayName || item.area || item.city);
    setSearchQuery("");

    let resolved = item;

    // Maps-style: one place-details call at the selected coordinates.
    if (
      item.external
      && item.latitude != null
      && item.longitude != null
      && !Number.isNaN(item.latitude)
      && !Number.isNaN(item.longitude)
    ) {
      try {
        const details = await resolvePlace(item.latitude, item.longitude);
        if (details?.area) {
          resolved = {
            ...item,
            ...details,
            district: details.district || item.district || "",
            mandal: details.mandal || item.mandal || "",
            external: true,
          };
        }
      } catch {
        // Use autocomplete preview if place details unavailable.
      }
    }

    let pincode = resolved.pincode?.trim() || "";
    const cityForForm = resolved.district?.trim() || resolved.city?.trim() || "";
    resolved = { ...resolved, city: cityForForm };

    let ids = await resolveLocationIds({
      country: resolved.country,
      state: resolved.state,
      city: cityForForm,
      area: resolved.area,
      pincode,
    });

    if (resolved.countryId > 0) {
      ids = {
        countryId: resolved.countryId,
        ...(resolved.stateId > 0 ? { stateId: resolved.stateId } : ids.stateId ? { stateId: ids.stateId } : {}),
        ...(resolved.cityId > 0 ? { cityId: resolved.cityId } : ids.cityId ? { cityId: ids.cityId } : {}),
        ...(resolved.areaId > 0 ? { areaId: resolved.areaId } : ids.areaId ? { areaId: ids.areaId } : {}),
        ...(ids.pincodeId ? { pincodeId: ids.pincodeId } : {}),
        ...(ids.pincode ? { pincode: ids.pincode } : {}),
      };
    }

    if (!isValidPincode(pincode) && ids.pincode) {
      pincode = ids.pincode;
    }
    if (!isValidPincode(pincode) && ids.areaId) {
      pincode = await resolvePincodeForArea(ids.areaId, pincode);
    }

    const canSaveHierarchy = resolved.country && resolved.state && cityForForm && resolved.area;

    if (canSaveHierarchy) {
      try {
        const saved = await saveLocation({
          country: resolved.country,
          state: resolved.state,
          city: cityForForm,
          area: resolved.area,
          ...(isValidPincode(pincode) ? { pincode } : {}),
        });
        resolved = { ...saved, external: false, district: cityForForm };
        ids = {
          countryId: saved.countryId,
          ...(saved.stateId > 0 ? { stateId: saved.stateId } : {}),
          ...(saved.cityId > 0 ? { cityId: saved.cityId } : {}),
          ...(saved.areaId > 0 ? { areaId: saved.areaId } : {}),
        };
        if (isValidPincode(saved.pincode)) {
          pincode = saved.pincode;
        }
      } catch (e) {
        setSearchError(getApiErrorMessage(e, "Location filled but could not save to database."));
      }
    }

    const needsManualPincode = Boolean(ids.areaId) && !isValidPincode(pincode);
    setShowManualPincode(needsManualPincode);
    if (!needsManualPincode) {
      setManualPincode("");
      setPincodeError("");
    }

    setCountryId(ids.countryId);
    setStateId(ids.stateId);
    setCityId(ids.cityId);
    setAreaId(ids.areaId);
    hydratedRef.current = [resolved.country, resolved.state, cityForForm, resolved.area, pincode].join("|");
    pendingPincodeRef.current = pincode;

    onChange({
      country: resolved.country,
      state: resolved.state,
      city: cityForForm,
      area: resolved.area,
      pincode,
    });
    (["country", "state", "city", "area", "pincode"] as FieldKey[]).forEach((f) => onClearError?.(f));

    const label = resolved.displayName
      || [resolved.area, resolved.mandal, cityForForm, resolved.state, pincode].filter(Boolean).join(", ");
    setSearchDisplay(label);
    setSearchQuery("");

    try {
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
      if (pincode && pincodesData.every((p) => p.name !== pincode)) {
        setPincodes([{ id: -1, name: pincode }, ...pincodesData]);
      } else {
        setPincodes(pincodesData);
      }

      if (ids.areaId && !isValidPincode(pincode) && pincodesData.length === 0) {
        setShowManualPincode(true);
      }
    } catch {
      // Cascading effects will still load lists from IDs.
    }
  }, [onChange, onClearError, resolvePincodeForArea]);

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
        })
        .catch((err) => {
          setSearchResults([]);
          const msg = err instanceof Error ? err.message : "Could not search locations. Please try again.";
          setSearchError(msg.includes("Cannot reach API") ? msg : "Could not search locations. Please try again.");
        })
        .finally(() => setSearchLoading(false));
    }, 250);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, searchCountry, buildAddDraftFromQuery]);

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
    setShowManualPincode(false);
    setManualPincode("");
    setPincodeError("");

    void fetchPincodes(item.id).then((data) => {
      setPincodes(data);
      const pin = data.at(0)?.name ?? "";
      if (pin) {
        onChange({ ...value, area: item.name, pincode: pin });
        onClearError?.("pincode");
        setShowManualPincode(false);
      } else {
        setShowManualPincode(true);
      }
    }).catch(() => {
      // areaId effect will retry loading pincodes
    });
  };

  const selectPincode = (item: LocationItem) => {
    onChange({ ...value, pincode: item.name });
    onClearError?.("pincode");
  };

  const handleAddPincode = useCallback(async () => {
    const pin = manualPincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError("Enter a valid 6-digit pincode");
      return;
    }
    setPincodeError("");
    setAddingPincode(true);
    try {
      let targetAreaId = areaId;
      if (!targetAreaId) {
        if (!value.country.trim() || !value.state.trim() || !value.city.trim() || !value.area.trim()) {
          setPincodeError("Select a location first, then add the pincode.");
          return;
        }
        const saved = await saveLocation({
          country: value.country.trim(),
          state: value.state.trim(),
          city: value.city.trim(),
          area: value.area.trim(),
          pincode: pin,
        });
        targetAreaId = saved.areaId;
        setCountryId(saved.countryId);
        setStateId(saved.stateId);
        setCityId(saved.cityId);
        setAreaId(saved.areaId);
        pendingPincodeRef.current = pin;
        setPincodes([{ id: saved.pincodeId, name: pin }]);
        onChange({ ...value, pincode: pin });
        onClearError?.("pincode");
        setShowManualPincode(false);
        setManualPincode("");
        return;
      }

      const result = await addPincode({ areaId: targetAreaId, pincode: pin });
      setPincodes([{ ...result }, ...pincodes]);
      pendingPincodeRef.current = pin;
      onChange({ ...value, pincode: pin });
      onClearError?.("pincode");
      setShowManualPincode(false);
      setManualPincode("");
    } catch (e) {
      setPincodeError(getApiErrorMessage(e, "Could not add pincode. Please try again."));
    } finally {
      setAddingPincode(false);
    }
  }, [areaId, manualPincode, pincodes, value, onChange, onClearError]);

  return (
    <View style={s.wrap}>
      <View style={s.searchWrap}>
        <Text style={s.label}>Search location</Text>
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
              const first = searchResults.at(0);
              if (first !== undefined) void applySearchResult(first);
            }}
            onBlur={() => {
              // Keep dropdown open briefly so tap on suggestion registers (Maps-style).
              setTimeout(() => {
                if (!searchQuery.trim()) {
                  setShowSearchResults(false);
                }
              }, 200);
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
          Type an area or village name — suggestions appear below like Google Maps. Tap one to fill all fields.
        </Text>
        {showSearchResults && searchQuery.trim().length > 0 && searchLoading && (
          <Text style={s.searchStatus}>Finding locations…</Text>
        )}
        {showSearchResults && searchError && !searchLoading && shouldShowNoResults(searchQuery) ? (
          <Text style={s.searchError}>{searchError}</Text>
        ) : null}
        {showSearchResults && searchQuery.trim().length > 0 && searchResults.length > 0 && (
          <View style={s.searchMenu}>
            <Text style={s.searchCount}>
              {searchResults.length} suggestion{searchResults.length === 1 ? "" : "s"} — tap to select
            </Text>
            <ScrollView
              style={s.searchMenuScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator
              bounces={false}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.external ? `ext-${item.externalId || item.displayName}` : `${item.areaId}-${item.pincodeId || item.cityId}`}
                  style={s.searchOption}
                  activeOpacity={0.7}
                  onPress={() => { void applySearchResult(item); }}
                >
                  <View style={s.searchOptionRow}>
                    <Text style={s.searchOptionTitle}>
                      {formatSuggestionTitle(item)}
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
            placeholder="Select City (District)"
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
            disabled={!areaId && !value.pincode}
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

      {showManualPincode && (areaId || (value.area.trim() && value.city.trim() && value.state.trim())) && (
        <View style={s.manualPincodeWrap}>
          <Text style={s.manualPincodeHint}>
            If pincode doesn&apos;t auto-fill after selecting a location, enter it manually below and tap Add &amp; select to save it to the database.
          </Text>
          <View style={s.manualPincodeRow}>
            <View style={s.manualPincodeInputWrap}>
              <TextInput
                style={s.manualPincodeInput}
                value={manualPincode}
                onChangeText={(t) => {
                  setManualPincode(t.replace(/\D/g, "").slice(0, 6));
                  setPincodeError("");
                }}
                placeholder="6-digit pincode"
                placeholderTextColor={T.textLight}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddPincode}
              style={[s.manualPincodeBtn, { backgroundColor: accentColor }]}
              activeOpacity={0.88}
              disabled={addingPincode || !/^\d{6}$/.test(manualPincode)}
            >
              {addingPincode ? (
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <Text style={s.manualPincodeBtnText}>Add & select</Text>
              )}
            </TouchableOpacity>
          </View>
          {pincodeError ? (
            <View style={s.pincodeErrorRow}>
              <Icon name="exclamation-circle" size={11} color={T.error} />
              <Text style={s.pincodeErrorText}>{pincodeError}</Text>
            </View>
          ) : null}
        </View>
      )}
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
  manualPincodeWrap: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: T.navyPale,
    gap: 8,
  },
  manualPincodeHint: {
    fontSize: 11,
    color: T.textSoft,
    lineHeight: 15,
  },
  manualPincodeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  manualPincodeInputWrap: {
    flex: 1,
  },
  manualPincodeInput: {
    backgroundColor: T.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: T.textDark,
    fontFamily: fontFamilies.regular,
  },
  manualPincodeBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  manualPincodeBtnText: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: T.white,
  },
  pincodeErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  pincodeErrorText: {
    fontSize: 11,
    color: T.error,
    fontFamily: fontFamilies.regular,
  },
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
