
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPdf = async (element: HTMLElement, fileName: string) => {
    // The 'element' should be the one containing all content to be exported,
    // including any headers or footers that are part of the DOM.
    const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        onclone: (document) => {
            // Force transparent background on charts for dark mode printing
             document.querySelectorAll('.recharts-surface').forEach(svg => {
                (svg as HTMLElement).style.background = 'transparent';
             });
        }
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'letter');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${fileName}.pdf`);
};

