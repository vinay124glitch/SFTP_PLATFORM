'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Download, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatINR } from '@/lib/currency';

interface ReportExportButtonsProps {
  report: any;
  summary: any;
}

export function ReportExportButtons({ report, summary }: ReportExportButtonsProps) {
  const exportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(report.society.name, 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(report.title, 14, 28);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Report Number: ${report.reportNumber} | FY: ${report.financialYear.name} | Generated: ${new Date(
        report.generatedAt
      ).toLocaleDateString()}`,
      14,
      35
    );

    // Balance Sheet Table
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Amount (INR)']],
      body: [
        ['Opening Balance', formatINR(summary.openingBalance)],
        ['Total Approved Income', formatINR(summary.totalIncome)],
        ['Total Approved Expenses', formatINR(summary.totalExpenses)],
        ['Closing Net Balance', formatINR(summary.currentBalance)],
      ],
      headStyles: { fillColor: [2, 132, 199] },
      theme: 'grid',
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Category Breakdown Table
    if (summary.categoryBreakdown && summary.categoryBreakdown.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      doc.text('Expense Category Breakdown', 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Category', 'Disbursed (INR)']],
        body: summary.categoryBreakdown.map((c: any) => [c.name, formatINR(c.paise)]),
        headStyles: { fillColor: [51, 65, 85] },
        theme: 'striped',
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Budget Table
    if (summary.budgetUtilization && summary.budgetUtilization.length > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      doc.text('Budget Allocations & Utilization', 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Budget Title', 'Allocated', 'Spent', 'Remaining', 'Utilization']],
        body: summary.budgetUtilization.map((b: any) => [
          b.name,
          formatINR(b.allocatedAmount),
          formatINR(b.actualSpending),
          formatINR(b.remaining),
          `${b.utilization}%`,
        ]),
        headStyles: { fillColor: [51, 65, 85] },
        theme: 'striped',
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Signatures
    if (currentY > 250) {
      doc.addPage();
      currentY = 30;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text('Treasurer Signature: _______________________', 14, currentY + 15);
    doc.text('Faculty Coordinator Signature: _______________________', 110, currentY + 15);

    doc.save(`${report.reportNumber}.pdf`);
  };

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Amount (INR)'],
      ['Opening Balance', summary.openingBalance],
      ['Total Approved Income', summary.totalIncome],
      ['Total Approved Expenses', summary.totalExpenses],
      ['Closing Net Balance', summary.currentBalance],
      [],
      ['Category Breakdown', 'Amount (Paise)'],
      ...(summary.categoryBreakdown || []).map((c: any) => [c.name, c.paise]),
      [],
      ['Budget Title', 'Allocated (Paise)', 'Spent (Paise)', 'Remaining (Paise)', 'Utilization %'],
      ...(summary.budgetUtilization || []).map((b: any) => [
        b.name,
        b.allocatedAmount,
        b.actualSpending,
        b.remaining,
        `${b.utilization}%`,
      ]),
    ];

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.reportNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 text-xs">
        <Download className="w-3.5 h-3.5" />
        CSV
      </Button>
      <Button variant="primary" size="sm" onClick={exportPDF} className="gap-1 text-xs">
        <Printer className="w-3.5 h-3.5" />
        PDF Report
      </Button>
    </div>
  );
}
