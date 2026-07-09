import { TitleBar, type ActionConfig } from './title-bar';

type PageShellProps = {
    children: React.ReactNode;
    actions?: ActionConfig[];
    title?: string;
    /** Where the back chevron links to. Defaults to '/' (the Today surface). */
    backTo?: string;
};

export const PageShell = ({ children, actions, title, backTo }: PageShellProps) => {
    return (
        <>
            <TitleBar title={title} actions={actions} backTo={backTo} />
            {children}
        </>
    );
};
