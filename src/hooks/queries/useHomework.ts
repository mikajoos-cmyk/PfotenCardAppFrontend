import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useHomework = (token: string | null) => {
    const queryClient = useQueryClient();

    const templates = useQuery({
        queryKey: ['homework-templates', token],
        queryFn: () => apiClient.getHomeworkTemplates(token),
        enabled: !!token,
    });

    const userHomework = (userId: number | string) => useQuery({
        queryKey: ['user-homework', userId, token],
        queryFn: () => apiClient.getUserHomework(userId, token),
        enabled: !!token && !!userId,
    });

    const createTemplate = useMutation({
        mutationFn: (data: any) => apiClient.createHomeworkTemplate(data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homework-templates'] });
        },
    });

    const updateTemplate = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => 
            apiClient.updateHomeworkTemplate(id, data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homework-templates'] });
        },
    });

    const deleteTemplate = useMutation({
        mutationFn: (id: number) => apiClient.deleteHomeworkTemplate(id, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homework-templates'] });
        },
    });

    const assignHomework = useMutation({
        mutationFn: (data: any) => apiClient.assignHomework(data, token),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['user-homework', variables.user_id] });
        },
    });

    const completeHomework = useMutation({
        mutationFn: ({ id, data }: { id: number, data: { client_feedback?: string } }) => 
            apiClient.completeHomework(id, data, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-homework'] });
        },
    });

    const uploadFiles = useMutation({
        mutationFn: (files: File[]) => apiClient.uploadHomeworkFiles(files, token),
    });

    return {
        templates,
        userHomework,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        assignHomework,
        completeHomework,
        uploadFiles,
    };
};
