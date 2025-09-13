"use client";
import { Controller } from "react-hook-form";
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormField,
    FormItem,
    FormControl,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X, PlusCircle } from "lucide-react";

// Zod schema
const schema = z.object({
    CityID: z.number().optional(),
    Name: z.string().min(2, "اسم المدينة مطلوب."),
    IsActive: z.boolean(),
    Districts: z
        .array(z.object({ Name: z.string().min(1, "اسم المنطقة مطلوب.") }))
        .default([]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    initialData?: FormValues;
    onSubmit: (formData: FormData) => Promise<any>;
    onSuccess: () => void;
}

export function AddDeliveryCityForm({ initialData, onSubmit, onSuccess }: Props) {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            CityID: initialData?.CityID,
            Name: initialData?.Name || "",
            IsActive: initialData?.IsActive ?? true,
            Districts: initialData?.Districts || [],
        },
    });
    const { register, control, handleSubmit, reset, setValue, getValues, formState } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "Districts" });
    const [newDistrict, setNewDistrict] = useState("");

    // reset form when editing a city
    useEffect(() => {
        if (initialData) {
            reset({
                CityID: initialData.CityID,
                Name: initialData.Name,
                IsActive: initialData.IsActive,
                Districts: initialData.Districts,
            });
        }
    }, [initialData, reset]);

    const internalSubmit = async (data: FormValues) => {
        const f = new FormData();
        if (data.CityID) f.set("CityID", data.CityID.toString());
        f.set("Name", data.Name);
        if (data.IsActive) f.set("IsActive", "on");
        data.Districts.forEach((d, i) => f.set(`Districts[${i}].Name`, d.Name));
        try {
            const res = await onSubmit(f);
            if (res && res.success) {
                onSuccess();
                reset();
            } else {
                console.error('Operation failed:', res);
            }
        } catch (err) {
            console.error('Submission error:', err);
        }
    };

    const addDistrict = () => {
        const v = newDistrict.trim();
        if (v) {
            append({ Name: v });
            setNewDistrict("");
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
                {initialData?.CityID && (
                    <input type="hidden" {...register("CityID", { valueAsNumber: true })} />
                )}

                <FormField
                    control={control}
                    name="Name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم المدينة</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage>{formState.errors.Name?.message}</FormMessage>
                        </FormItem>
                    )}
                />

                <FormItem className="flex items-center gap-2">
                    <FormLabel>نشط؟</FormLabel>
                    <FormControl>
                        <Controller
                            name="IsActive"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </FormControl>
                </FormItem>


                <FormItem>
                    <FormLabel>المناطق</FormLabel>
                    <div className="flex gap-2">
                        <Input
                            placeholder="أضف منطقة"
                            value={newDistrict}
                            onChange={(e) => setNewDistrict(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addDistrict();
                                }
                            }}
                        />
                        <Button type="button" onClick={addDistrict} variant="outline" size="icon">
                            <PlusCircle />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {fields.map((f, idx) => (
                            <div key={f.id} className="flex items-center gap-1 bg-gray-100 p-1 rounded">
                                <input
                                    type="hidden"
                                    name={`Districts[${idx}].Name`}
                                    value={f.Name}
                                />
                                <span>{f.Name}</span>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => remove(idx)}
                                >
                                    <X className="h-4 w-4 text-red-600" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </FormItem>

                <Button type="submit">
                    {initialData ? "حفظ التعديل" : "إضافة المدينة"}
                </Button>
            </form>
        </Form>
    );
}
