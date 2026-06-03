import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from '@expo/vector-icons';

import { useMemo, useRef, useState, useEffect } from 'react';
import { fetchTopSellingProducts, type TopSellingProduct } from '@/services/earningsApi';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';

type TopProductRow = {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice: number;
  discount: string;
  qty: number;
  sales: number;
  rating: number | null;
  isWishlist: boolean;
  added: boolean;
  image: string;
};

function parseInrAmount(value?: string | null): number {
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.]/g, "")) || 0;
}

function mapTopProduct(p: TopSellingProduct, idx: number): TopProductRow {
  const price = parseInrAmount(p.price);
  const sold = p.sold ?? 0;
  const sales = price * sold;
  const oldPrice = parseInrAmount(p.mrp);
  return {
    id: Number(p.id) || idx + 1,
    name: p.name,
    category: p.category || "—",
    price,
    oldPrice,
    discount: p.discount?.trim() ? p.discount : "—",
    qty: sold,
    sales,
    rating: p.avgRating != null && p.avgRating > 0 ? p.avgRating : null,
    isWishlist: false,
    added: false,
    image: p.image || "",
  };
}

const sortOptions = ['Price Low to High', 'Price High to Low', 'Top Rated', 'Best Selling'];
const filterOptions = ['All', 'Above 4 Rating', 'Price Below ₹1000', 'Wishlist Only', 'Custom Date Range'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarPicker({
  startDate,
  endDate,
  onRangeChange,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cellLayouts = useRef<{ date: Date; x: number; y: number; width: number; height: number }[]>([]);
  const gridRef = useRef<View>(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartDate = useRef<Date | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isInRange = (d: Date) => {
    if (!startDate || !endDate) return false;
    const s = startDate < endDate ? startDate : endDate;
    const e = startDate < endDate ? endDate : startDate;
    return d > s && d < e;
  };

  const isStart = (d: Date) => startDate ? isSameDay(d, startDate) : false;
  const isEnd = (d: Date) => endDate ? isSameDay(d, endDate) : false;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDateAtPoint = (pageX: number, pageY: number): Date | null => {
    const relX = pageX - gridOffset.current.x;
    const relY = pageY - gridOffset.current.y;
    for (const cell of cellLayouts.current) {
      if (relX >= cell.x && relX <= cell.x + cell.width && relY >= cell.y && relY <= cell.y + cell.height) {
        return cell.date;
      }
    }
    return null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        const date = getDateAtPoint(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        if (date) {
          dragStartDate.current = date;
          onRangeChange(date, null);
        }
      },
      onPanResponderMove: (evt) => {
        if (!isDragging.current || !dragStartDate.current) return;
        const date = getDateAtPoint(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        if (date && !isSameDay(date, dragStartDate.current)) {
          const s = dragStartDate.current < date ? dragStartDate.current : date;
          const e = dragStartDate.current < date ? date : dragStartDate.current;
          onRangeChange(s, e);
        }
      },
      onPanResponderRelease: (evt) => {
        isDragging.current = false;
        const date = getDateAtPoint(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        if (date && dragStartDate.current) {
          if (isSameDay(date, dragStartDate.current)) {
            onRangeChange(dragStartDate.current, null);
          } else {
            const s = dragStartDate.current < date ? dragStartDate.current : date;
            const e = dragStartDate.current < date ? date : dragStartDate.current;
            onRangeChange(s, e);
          }
        }
        dragStartDate.current = null;
      },
    })
  ).current;

  return (
    <View style={calStyles.container}>
      <View style={calStyles.navRow}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#0A2A66" />
        </TouchableOpacity>
        <Text style={calStyles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#0A2A66" />
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekRow}>
        {DAYS.map(d => (
          <Text key={d} style={calStyles.dayHeader}>{d}</Text>
        ))}
      </View>
      <Text style={calStyles.dragHint}>Tap a date or drag to select a range</Text>
      <View
        ref={gridRef}
        style={calStyles.grid}
        onLayout={() => {
          gridRef.current?.measureInWindow((x, y) => {
            gridOffset.current = { x, y };
          });
        }}
        {...panResponder.panHandlers}
      >
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={calStyles.cell} />;
          const cellDate = new Date(viewYear, viewMonth, day);
          const start = isStart(cellDate);
          const end = isEnd(cellDate);
          const inRange = isInRange(cellDate);
          return (
            <View
              key={idx}
              style={[calStyles.cell, inRange && calStyles.rangeCell, (start || end) && calStyles.selectedCell]}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                const existing = cellLayouts.current.findIndex(c =>
                  c.date.getFullYear() === cellDate.getFullYear() &&
                  c.date.getMonth() === cellDate.getMonth() &&
                  c.date.getDate() === cellDate.getDate()
                );
                const entry = { date: cellDate, x, y, width, height };
                if (existing >= 0) cellLayouts.current[existing] = entry;
                else cellLayouts.current.push(entry);
              }}
            >
              <Text style={[calStyles.dayText, (start || end) && calStyles.selectedDayText, inRange && calStyles.rangeDayText]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { paddingTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#0A2A66' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#888', paddingVertical: 4 },
  dragHint: { textAlign: 'center', fontSize: 11, color: '#0A2A66', opacity: 0.55, marginBottom: 8, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  rangeCell: { backgroundColor: '#D6E4FF' },
  selectedCell: { backgroundColor: '#0A2A66', borderRadius: 20 },
  dayText: { fontSize: 14, color: '#333', fontWeight: '500' },
  selectedDayText: { color: '#fff', fontWeight: '700' },
  rangeDayText: { color: '#0A2A66', fontWeight: '600' },
});

export default function TopSellingProducts() {
  const [products, setProducts] = useState<TopProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTopSellingProducts(50)
      .then((rows) => {
        setProducts(rows.map(mapTopProduct));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const [searchText, setSearchText] = useState('');
  const [sortModal, setSortModal] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Best Selling');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const sortBtnRef = useRef<View>(null);
  const filterBtnRef = useRef<View>(null);
  const categoryBtnRef = useRef<View>(null);

  const [sortBtnPos, setSortBtnPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [filterBtnPos, setFilterBtnPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [categoryBtnPos, setCategoryBtnPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const openSortDropdown = () => {
    if (Platform.OS === 'web') {
      sortBtnRef.current?.measureInWindow((x, y, w, h) => {
        setSortBtnPos({ x, y, w, h });
        setSortModal(true);
      });
    } else {
      setSortModal(true);
    }
  };

  const openFilterDropdown = () => {
    if (Platform.OS === 'web') {
      filterBtnRef.current?.measureInWindow((x, y, w, h) => {
        setFilterBtnPos({ x, y, w, h });
        setFilterModal(true);
      });
    } else {
      setFilterModal(true);
    }
  };

  const openCategoryDropdown = () => {
    if (Platform.OS === 'web') {
      categoryBtnRef.current?.measureInWindow((x, y, w, h) => {
        setCategoryBtnPos({ x, y, w, h });
        setCategoryModal(true);
      });
    } else {
      setCategoryModal(true);
    }
  };

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c && c !== "—") cats.add(c);
    }
    return ["All", ...Array.from(cats).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  useEffect(() => {
    if (selectedCategory !== "All" && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categoryOptions, selectedCategory]);
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleRangeChange = (start: Date | null, end: Date | null) => {
    setDateRangeStart(start);
    setDateRangeEnd(end);
  };

  const formatDate = (d: Date | null) => {
    if (!d) return 'Select';
    const m = MONTHS[d.getMonth()];
    const mStr = m ? m.slice(0, 3) : '';
    return `${d.getDate()} ${mStr} ${d.getFullYear()}`;
  };

  const toggleWishlist = (id: number) => {
    setProducts(products.map(item => item.id === id ? { ...item, isWishlist: !item.isWishlist } : item));
  };

  const handleAddProduct = (id: number) => {
    const product = products.find(item => item.id === id);
    setProducts(products.map(item => item.id === id ? { ...item, added: !item.added } : item));
    if (product) {
      Alert.alert(product.added ? 'Removed from Cart' : 'Added to Cart', `${product.name} updated successfully`);
    }
  };

  const filteredProducts = useMemo(() => {
    let data = [...products];
    if (searchText.trim() !== '') data = data.filter(item => item.name.toLowerCase().includes(searchText.toLowerCase()));
    if (selectedCategory !== 'All') data = data.filter(item => item.category === selectedCategory);
    if (selectedFilter === 'Above 4 Rating') {
      data = data.filter(item => item.rating != null && item.rating >= 4);
    }
    if (selectedFilter === 'Price Below ₹1000') data = data.filter(item => item.price < 1000);
    if (selectedFilter === 'Wishlist Only') data = data.filter(item => item.isWishlist);
    if (selectedSort === 'Price Low to High') data.sort((a, b) => a.price - b.price);
    if (selectedSort === 'Price High to Low') data.sort((a, b) => b.price - a.price);
    if (selectedSort === 'Top Rated') {
      data.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (selectedSort === 'Best Selling') data.sort((a, b) => b.sales - a.sales);
    return data;
  }, [products, searchText, selectedSort, selectedFilter, selectedCategory]);

  const renderSortModal = () => {
    if (Platform.OS === 'web') {
      return (
        <Modal transparent visible={sortModal} animationType="fade" onRequestClose={() => setSortModal(false)}>
          <TouchableWithoutFeedback onPress={() => setSortModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[
            styles.webDropdownMenu,
            {
              top: sortBtnPos.y + sortBtnPos.h + 6,
              left: sortBtnPos.x,
              width: Math.max(sortBtnPos.w, 240),
            }
          ]}>
            <View style={styles.webDropdownHeader}>
              <Text style={styles.webDropdownTitle}>Sort Products</Text>
              <TouchableOpacity onPress={() => setSortModal(false)}>
                <Ionicons name="close" size={18} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {sortOptions.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.webOptionItem, selectedSort === item && styles.webSelectedOption]}
                  onPress={() => { setSelectedSort(item); setSortModal(false); }}>
                  <Text style={[styles.webOptionText, selectedSort === item && { color: '#fff' }]}>{item}</Text>
                  {selectedSort === item && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return (
      <Modal transparent animationType="slide" visible={sortModal} onRequestClose={() => setSortModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Products</Text>
              <TouchableOpacity onPress={() => setSortModal(false)}>
                <Ionicons name="close" size={24} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sortOptions}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, selectedSort === item && styles.selectedOption]}
                  onPress={() => { setSelectedSort(item); setSortModal(false); }}>
                  <Text style={[styles.optionText, selectedSort === item && { color: '#fff' }]}>{item}</Text>
                  {selectedSort === item && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => {
    if (Platform.OS === 'web') {
      return (
        <Modal transparent visible={filterModal} animationType="fade" onRequestClose={() => { setFilterModal(false); setShowCalendar(false); }}>
          <TouchableWithoutFeedback onPress={() => { setFilterModal(false); setShowCalendar(false); }}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[
            styles.webDropdownMenu,
            {
              top: filterBtnPos.y + filterBtnPos.h + 6,
              left: filterBtnPos.x,
              width: Math.max(filterBtnPos.w, 320),
            }
          ]}>
            <View style={styles.webDropdownHeader}>
              <Text style={styles.webDropdownTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => { setFilterModal(false); setShowCalendar(false); }}>
                <Ionicons name="close" size={18} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {filterOptions.map(item => (
                <View key={item}>
                  <TouchableOpacity
                    style={[styles.webOptionItem, selectedFilter === item && styles.webSelectedOption]}
                    onPress={() => {
                      setSelectedFilter(item);
                      if (item === 'Custom Date Range') { setShowCalendar(true); }
                      else { setShowCalendar(false); setFilterModal(false); }
                    }}>
                    <Text style={[styles.webOptionText, selectedFilter === item && { color: '#fff' }]}>{item}</Text>
                    {selectedFilter === item && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                  </TouchableOpacity>
                  {item === 'Custom Date Range' && showCalendar && selectedFilter === 'Custom Date Range' && (
                    <View style={styles.calendarWrapper}>
                      <View style={styles.dateRangeRow}>
                        <View style={[styles.dateBox, dateRangeStart && styles.dateBoxActive]}>
                          <Text style={styles.dateBoxLabel}>From</Text>
                          <Text style={styles.dateBoxValue}>{formatDate(dateRangeStart)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={18} color="#0A2A66" />
                        <View style={[styles.dateBox, dateRangeEnd && styles.dateBoxActive]}>
                          <Text style={styles.dateBoxLabel}>To</Text>
                          <Text style={styles.dateBoxValue}>{formatDate(dateRangeEnd)}</Text>
                        </View>
                      </View>
                      <CalendarPicker startDate={dateRangeStart} endDate={dateRangeEnd} onRangeChange={handleRangeChange} />
                      {dateRangeStart && dateRangeEnd && (
                        <TouchableOpacity style={styles.applyDateBtn} onPress={() => { setShowCalendar(false); setFilterModal(false); }}>
                          <Text style={styles.applyDateText}>Apply: {formatDate(dateRangeStart)} → {formatDate(dateRangeEnd)}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.clearDateBtn} onPress={() => { setDateRangeStart(null); setDateRangeEnd(null); }}>
                        <Text style={styles.clearDateText}>Clear Dates</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return (
      <Modal transparent animationType="slide" visible={filterModal} onRequestClose={() => { setFilterModal(false); setShowCalendar(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => { setFilterModal(false); setShowCalendar(false); }}>
                <Ionicons name="close" size={24} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filterOptions.map(item => (
                <View key={item}>
                  <TouchableOpacity
                    style={[styles.optionItem, selectedFilter === item && styles.selectedOption]}
                    onPress={() => {
                      setSelectedFilter(item);
                      if (item === 'Custom Date Range') { setShowCalendar(true); }
                      else { setShowCalendar(false); setFilterModal(false); }
                    }}>
                    <Text style={[styles.optionText, selectedFilter === item && { color: '#fff' }]}>{item}</Text>
                    {selectedFilter === item && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                  </TouchableOpacity>
                  {item === 'Custom Date Range' && showCalendar && selectedFilter === 'Custom Date Range' && (
                    <View style={styles.calendarWrapper}>
                      <View style={styles.dateRangeRow}>
                        <View style={[styles.dateBox, dateRangeStart && styles.dateBoxActive]}>
                          <Text style={styles.dateBoxLabel}>From</Text>
                          <Text style={styles.dateBoxValue}>{formatDate(dateRangeStart)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={18} color="#0A2A66" />
                        <View style={[styles.dateBox, dateRangeEnd && styles.dateBoxActive]}>
                          <Text style={styles.dateBoxLabel}>To</Text>
                          <Text style={styles.dateBoxValue}>{formatDate(dateRangeEnd)}</Text>
                        </View>
                      </View>
                      <CalendarPicker startDate={dateRangeStart} endDate={dateRangeEnd} onRangeChange={handleRangeChange} />
                      {dateRangeStart && dateRangeEnd && (
                        <TouchableOpacity style={styles.applyDateBtn} onPress={() => { setShowCalendar(false); setFilterModal(false); }}>
                          <Text style={styles.applyDateText}>Apply: {formatDate(dateRangeStart)} → {formatDate(dateRangeEnd)}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.clearDateBtn} onPress={() => { setDateRangeStart(null); setDateRangeEnd(null); }}>
                        <Text style={styles.clearDateText}>Clear Dates</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCategoryModal = () => {
    if (Platform.OS === 'web') {
      return (
        <Modal transparent visible={categoryModal} animationType="fade" onRequestClose={() => setCategoryModal(false)}>
          <TouchableWithoutFeedback onPress={() => setCategoryModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[
            styles.webDropdownMenu,
            {
              top: categoryBtnPos.y + categoryBtnPos.h + 6,
              left: categoryBtnPos.x,
              width: Math.max(categoryBtnPos.w, 240),
            }
          ]}>
            <View style={styles.webDropdownHeader}>
              <Text style={styles.webDropdownTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}>
                <Ionicons name="close" size={18} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {categoryOptions.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.webOptionItem, selectedCategory === item && styles.webSelectedOption]}
                  onPress={() => { setSelectedCategory(item); setCategoryModal(false); }}>
                  <Text style={[styles.webOptionText, selectedCategory === item && { color: '#fff' }]}>{item}</Text>
                  {selectedCategory === item && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return (
      <Modal transparent animationType="slide" visible={categoryModal} onRequestClose={() => setCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#0A2A66" />
              </TouchableOpacity>
            </View>
            <View>
              {categoryOptions.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[styles.optionItem, selectedCategory === item && styles.selectedOption]}
                  onPress={() => { setSelectedCategory(item); setCategoryModal(false); }}>
                  <Text style={[styles.optionText, selectedCategory === item && { color: '#fff' }]}>{item}</Text>
                  {selectedCategory === item && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderProduct = ({ item }: { item: TopProductRow }) => (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, { backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }]}>
          <MaterialIcons name="image-not-supported" size={32} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <View style={styles.ratingRow}>
          {item.rating != null ? (
            <>
              <AntDesign name="star" size={15} color="#FF8C00" />
              <Text style={styles.rating}>{item.rating}</Text>
            </>
          ) : (
            <Text style={[styles.rating, { color: "#9CA3AF" }]}>No ratings</Text>
          )}
          <View style={styles.bestSellerBadge}>
            <Text style={styles.bestSellerText}>Bestseller</Text>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price}</Text>
          {item.oldPrice > item.price ? (
            <Text style={styles.oldPrice}>₹{item.oldPrice}</Text>
          ) : null}
          {item.discount !== "—" ? (
            <Text style={styles.discount}>{item.discount}</Text>
          ) : null}
        </View>
        <Text style={styles.salesText}>Qty: {item.qty} • ₹{item.sales.toLocaleString()} Sales</Text>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity onPress={() => toggleWishlist(item.id)}>
          <Ionicons name={item.isWishlist ? 'heart' : 'heart-outline'} size={26} color={item.isWishlist ? '#FF8C00' : '#0A2A66'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, item.added && styles.addedBtn]} onPress={() => handleAddProduct(item.id)}>
          <Text style={[styles.addBtnText, item.added && { color: '#fff' }]}>{item.added ? 'Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <View style={styles.headerBlue}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Top Selling Products</Text>
            <View style={styles.headerIcons}>
              <Ionicons name="cart-outline" size={26} color="#fff" />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{products.filter(item => item.added).length}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={22} color="#777" />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#777"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* ── Sort/Filter/Category bar sits OUTSIDE FlatList — always sticky ── */}
      <View style={styles.stickyBar}>
        <View style={styles.filterRow}>
          <TouchableOpacity ref={sortBtnRef} style={styles.filterBox} onPress={openSortDropdown}>
            <Feather name="sliders" size={18} color="#0A2A66" />
            <Text style={styles.filterText}>Sort</Text>
            <Ionicons name="chevron-down" size={18} color="#0A2A66" />
          </TouchableOpacity>
          <TouchableOpacity ref={filterBtnRef} style={styles.filterBox} onPress={openFilterDropdown}>
            <Feather name="filter" size={18} color="#0A2A66" />
            <Text style={styles.filterText}>Filter</Text>
            <Ionicons name="chevron-down" size={18} color="#0A2A66" />
          </TouchableOpacity>
          <TouchableOpacity ref={categoryBtnRef} style={styles.filterBox} onPress={openCategoryDropdown}>
            <MaterialIcons name="category" size={18} color="#0A2A66" />
            <Text style={styles.filterText}>Category</Text>
            <Ionicons name="chevron-down" size={18} color="#0A2A66" />
          </TouchableOpacity>
        </View>
        <Text style={styles.productCount}>{filteredProducts.length} Products</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <ActivityIndicator size="large" color="#0A2A66" />
        </View>
      ) : (
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProduct}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.content}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: "center" }}>
            <Text style={{ color: "#6B7280" }}>No top products yet.</Text>
          </View>
        }
      />
      )}

      {Platform.OS !== 'web' && (
        <View style={styles.bottomTab}>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="home-outline" size={24} color="#0A2A66" />
            <Text style={styles.tabText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="grid-outline" size={24} color="#0A2A66" />
            <Text style={styles.tabText}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab}>
            <Ionicons name="clipboard" size={24} color="#0A2A66" />
            <Text style={styles.activeTabText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="chatbubble-outline" size={24} color="#0A2A66" />
            <Text style={styles.tabText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="person-outline" size={24} color="#0A2A66" />
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderSortModal()}
      {renderFilterModal()}
      {renderCategoryModal()}
    </SafeAreaView>
  );
}

const SEARCH_HEIGHT = 52;
const SEARCH_OVERLAP = SEARCH_HEIGHT / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FF' },
  headerWrapper: { zIndex: 10 },
  headerBlue: {
    backgroundColor: '#0A2A66',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: SEARCH_OVERLAP + 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: -SEARCH_OVERLAP,
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: SEARCH_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},

headerTitle: {
  color: '#fff',
  fontSize: 24,
  fontWeight: '700',
  textAlign: 'center',
},

headerIcons: {
  position: 'absolute',
  right: 0,
  flexDirection: 'row',
  alignItems: 'center',
},
  cartBadge: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#FF3B30', width: 18, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchInput: { flex: 1, marginLeft: 10, color: '#000', fontSize: 16 },

  // ── CHANGED: stickyBar lives outside FlatList — always truly sticky ──
   stickyBar: {
  backgroundColor: '#fff',
  paddingHorizontal: 16,
  paddingVertical: 8,
  marginTop: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 3,
  zIndex: 5,
},
  // ── END CHANGED ──

  content: { flex: 1, backgroundColor: '#F4F7FF' },
  listContent: {
  paddingHorizontal: 16,
  paddingBottom: 20,
  paddingTop: 4,
},
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 },
  filterBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#0A2A66', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 10,
    width: '31%', justifyContent: 'space-between', backgroundColor: '#F8FAFC',
  },
  filterText: { color: '#0A2A66', fontWeight: '700', fontSize: 14 },
  productCount: { fontSize: 22, fontWeight: '700', color: '#0A2A66', paddingBottom: 8 },
  card: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderWidth: 2, borderColor: '#ffffff', borderRadius: 22,
    padding: 12, marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 4.65, elevation: 6,
  },
  productImage: { width: 105, height: 135, borderRadius: 16 },
  productDetails: { flex: 1, marginLeft: 14 },
  productName: { fontSize: 16, fontWeight: '700', color: '#000' },
  category: { color: '#555', marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  rating: { color: '#555', marginLeft: 4, marginRight: 10, fontWeight: '700' },
  bestSellerBadge: {
    backgroundColor: '#FFF2E2', borderWidth: 1, borderColor: '#FF8C00',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  bestSellerText: { color: '#FF8C00', fontWeight: '700', fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap' },
  price: { color: '#000', fontSize: 16, fontWeight: '800' },
  oldPrice: { color: '#999', textDecorationLine: 'line-through', marginLeft: 10 },
  discount: { color: '#FF8C00', marginLeft: 10, fontWeight: '700' },
  salesText: { color: '#555', marginTop: 12, fontWeight: '600' },
  rightSection: { justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { borderWidth: 1.5, borderColor: '#0A2A66', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#fff' },
  addedBtn: { backgroundColor: '#0A2A66' },
  addBtnText: { color: '#0A2A66', fontWeight: '700', fontSize: 14 },
  bottomTab: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  tabItem: { alignItems: 'center' },
  tabText: { color: '#0A2A66', marginTop: 4, fontWeight: '600' },
  activeTab: { alignItems: 'center', backgroundColor: '#EAF1FF', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  activeTabText: { color: '#0A2A66', marginTop: 4, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        // @ts-ignore
        backdropFilter: 'blur(8px)',
      },
      default: {
        justifyContent: 'flex-end',
      }
    })
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    ...Platform.select({
      web: {
        width: 380,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        maxHeight: '85%',
      },
      default: {
        width: '100%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '55%',
      }
    })
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#0A2A66', fontSize: 20, fontWeight: '700' },
  optionItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 10, backgroundColor: '#F4F7FF',
  },
  selectedOption: { backgroundColor: '#0A2A66' },
  optionText: { color: '#0A2A66', fontSize: 14, fontWeight: '600' },
  calendarWrapper: { backgroundColor: '#EAF1FF', borderRadius: 16, padding: 14, marginBottom: 10, marginTop: -6 },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dateBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, marginHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  dateBoxActive: { borderColor: '#0A2A66', backgroundColor: '#EAF1FF' },
  dateBoxLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 2 },
  dateBoxValue: { fontSize: 13, color: '#0A2A66', fontWeight: '700' },
  applyDateBtn: { backgroundColor: '#0A2A66', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  applyDateText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clearDateBtn: { borderWidth: 1, borderColor: '#0A2A66', borderRadius: 14, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  clearDateText: { color: '#0A2A66', fontWeight: '700', fontSize: 14 },
  webDropdownMenu: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
  },
  webDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webDropdownTitle: {
    color: '#0A2A66',
    fontSize: 14,
    fontWeight: '700',
  },
  webOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F4F7FF',
  },
  webSelectedOption: {
    backgroundColor: '#0A2A66',
  },
  webOptionText: {
    color: '#0A2A66',
    fontSize: 12,
    fontWeight: '600',
  },
});