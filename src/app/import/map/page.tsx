
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import { Label } from '@/components/ui/label';

type CsvData = { [key: string]: string };

const REQUIRED_FIELDS = ['description', 'date'];
// Amount can be split into two columns or be a single column
const AMOUNT_FIELDS = ['amount', 'debit', 'credit']; 


// A simple function to guess the mapping
const guessMapping = (header: string): string => {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('date')) return 'date';
    if (lowerHeader.includes('description') || lowerHeader.includes('details') || lowerHeader.includes('memo') || lowerHeader.includes('payee')) return 'description';
    if (lowerHeader.includes('amount') && !lowerHeader.includes('credit') && !lowerHeader.includes('debit')) return 'amount';
    if (lowerHeader.includes('debit') || lowerHeader.includes('withdrawal')) return 'debit';
    if (lowerHeader.includes('credit') || lowerHeader.includes('deposit')) return 'credit';
    return '';
};


export default function MapColumnsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [headers, setHeaders] = useState<string[]>([]);
    const [sampleData, setSampleData] = useState<CsvData[]>([]);
    const [mappings, setMappings] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const storedHeaders = localStorage.getItem('csv_headers');
        const storedData = localStorage.getItem('csv_data');
        const statementType = localStorage.getItem('csv_statement_type');
        
        if (!storedHeaders || !storedData || !statementType) {
            toast({ variant: 'destructive', title: 'Error', description: 'No import data found. Please start over.' });
            router.push('/import');
            return;
        }

        const parsedHeaders = JSON.parse(storedHeaders);
        const parsedData = JSON.parse(storedData);

        setHeaders(parsedHeaders);
        setSampleData(parsedData.slice(0, 5));
        
        const initialMappings = parsedHeaders.reduce((acc: any, header: string) => {
            const guessedField = guessMapping(header);
             if (guessedField && !Object.values(acc).includes(guessedField)) {
                acc[header] = guessedField;
            } else {
                acc[header] = '';
            }
            return acc;
        }, {});
        setMappings(initialMappings);
    }, [router, toast]);

    const handleMappingChange = (header: string, field: string) => {
        setMappings(prev => ({ ...prev, [header]: field }));
    };

    const handleNextStep = () => {
        const mappedFields = Object.values(mappings);
        for (const field of REQUIRED_FIELDS) {
            if (!mappedFields.includes(field)) {
                toast({ variant: 'destructive', title: 'Mapping Incomplete', description: `Please map a column to the "${field}" field.` });
                return;
            }
        }
        
        const hasAmount = mappedFields.includes('amount') || (mappedFields.includes('debit') && mappedFields.includes('credit'));
        if (!hasAmount) {
             toast({ variant: 'destructive', title: 'Mapping Incomplete', description: `Please map a column to "Amount" or to both "Debit" and "Credit".` });
            return;
        }
        
        localStorage.setItem('csv_mappings', JSON.stringify(mappings));
        router.push('/import/review');
    };

    const appFields = [...REQUIRED_FIELDS, ...AMOUNT_FIELDS, 'ignore'];

    return (
        <AppShell>
            <div className="flex flex-col gap-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Import Transactions - Step 2 of 3</h1>
                    <p className="text-muted-foreground">Map your CSV columns to the application fields.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Map Columns</CardTitle>
                        <CardDescription>
                            Match columns from your CSV to the correct fields. We need at least 'Description', 'Date', and an amount field.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {headers.map(header => (
                                <div key={header} className="space-y-2">
                                    <Label htmlFor={`select-${header}`}>{header}</Label>
                                    <Select value={mappings[header]} onValueChange={(value) => handleMappingChange(header, value)}>
                                        <SelectTrigger id={`select-${header}`} className="w-full">
                                            <SelectValue placeholder="Select a field..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ignore">Ignore this column</SelectItem>
                                            {appFields.filter(f => f !== 'ignore').map(field => (
                                                <SelectItem key={field} value={field}>
                                                    <span className="capitalize">{field}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Preview</CardTitle>
                        <CardDescription>Here's a preview of the first few rows from your file.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sampleData.map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {headers.map(header => (
                                                <TableCell key={`${rowIndex}-${header}`} className="truncate max-w-xs">{row[header]}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/import')}>Back</Button>
                    <Button onClick={handleNextStep}>Next: Review & Categorize <ArrowRight className="ml-2 h-4 w-4"/></Button>
                </div>
            </div>
        </AppShell>
    );
}
