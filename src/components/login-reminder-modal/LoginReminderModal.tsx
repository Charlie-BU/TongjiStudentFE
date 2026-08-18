import { InfoCircleFilled } from "@ant-design/icons";
import { Modal } from "antd";
import "./LoginReminderModal.css";

type LoginReminderModalProps = {
    onCancel: () => void;
    onLogin: () => void;
    open: boolean;
};

// LoginReminderModal 在需要个人数据前说明登录权益与匿名会话保留规则。
export function LoginReminderModal({
    onCancel,
    onLogin,
    open,
}: LoginReminderModalProps) {
    return (
        <Modal
            cancelText="取消"
            className="login-reminder-modal"
            closable={false}
            okText="同济统一身份认证"
            onCancel={onCancel}
            onOk={onLogin}
            open={open}
            title={
                <>
                    <InfoCircleFilled className="login-reminder-modal-title-icon" />
                    <span>登录后解锁个人信息服务</span>
                </>
            }
        >
            <div className="login-reminder-modal-message">
                登录后可以查询课表、成绩、一卡通流水、借阅信息等与您个人相关的校园服务。
                未登录也可以继续对话，但匿名会话记录将在 24
                小时后自动清空。完成登录后，您可以保留对话记录，随时从历史会话继续。
            </div>
        </Modal>
    );
}
