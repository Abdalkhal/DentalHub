import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Package } from 'lucide-react-native';

import { Button, Input, Text } from '@/components/ui';
import { uploadProductImage, useSignedImageUrls, type Currency } from '@/lib/products';
import { randomUUID } from '@/lib/randomId';

export type ProductDraft = {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: Currency;
  stock: number;
  description: string;
  images: string[];
};

export function AddProductModal({
  open,
  onClose,
  ar,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  ar: boolean;
  initial?: ProductDraft | null;
  onSave: (draft: ProductDraft) => Promise<void>;
}) {
  const [draftId] = useState(() => initial?.id ?? randomUUID());
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'USD');
  const [stock, setStock] = useState(initial ? String(initial.stock) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: urlMap = {} } = useSignedImageUrls(images);

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const path = await uploadProductImage(draftId, {
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        type: asset.mimeType ?? undefined,
      });
      setImages((prev) => [...prev, path]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    if (!name.trim() || !brand.trim()) {
      setError(ar ? 'أدخل الاسم والشركة المصنعة' : 'Enter name and brand');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave({
        id: draftId,
        name: name.trim(),
        brand: brand.trim(),
        price: Number(price) || 0,
        currency,
        stock: Number(stock) || 0,
        description: description.trim(),
        images,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">
            {initial ? (ar ? 'تعديل منتج' : 'Edit product') : ar ? 'إضافة منتج' : 'Add product'}
          </Text>

          {/* Images */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            {images.map((path) => (
              <Pressable
                key={path}
                onPress={() => setImages((prev) => prev.filter((p) => p !== path))}
                className="relative"
              >
                {urlMap[path] ? (
                  <Image source={{ uri: urlMap[path] }} className="h-16 w-16 rounded-xl bg-slate-100" />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                    <Package size={24} color="#CBD5E1" strokeWidth={1.6} />
                  </View>
                )}
                <Text className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  ✕
                </Text>
              </Pressable>
            ))}
            <Button size="sm" variant="outline" title={ar ? '+ صورة' : '+ Image'} onPress={pickImage} />
          </View>

          <View className="mt-4 space-y-3">
            <Input value={name} onChangeText={setName} placeholder={ar ? 'اسم المنتج' : 'Product name'} />
            <Input value={brand} onChangeText={setBrand} placeholder={ar ? 'الشركة المصنعة' : 'Brand'} />
            <View className="flex-row gap-2">
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder={ar ? 'السعر' : 'Price'}
                keyboardType="numeric"
                className="flex-1"
              />
              <View className="flex-row gap-1.5">
                <Button size="sm" variant={currency === 'USD' ? 'primary' : 'outline'} title="$" onPress={() => setCurrency('USD')} />
                <Button size="sm" variant={currency === 'IQD' ? 'primary' : 'outline'} title="د.ع" onPress={() => setCurrency('IQD')} />
              </View>
            </View>
            <Input
              value={stock}
              onChangeText={setStock}
              placeholder={ar ? 'المخزون' : 'Stock'}
              keyboardType="numeric"
            />
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={ar ? 'الوصف (اختياري)' : 'Description (optional)'}
              multiline
            />
          </View>

          {!!error && (
            <Text className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {error}
            </Text>
          )}

          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="flex-1" />
            <Button title={ar ? 'حفظ' : 'Save'} onPress={save} loading={busy} className="flex-1" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
