import { DocumentProvider } from '@/context/DocumentContext';
import Editor from '@/components/Editor';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <DocumentProvider docId={id}>
            <Editor docId={id} />
        </DocumentProvider>
    );
}